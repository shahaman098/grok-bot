/** Disposable PostgreSQL quota tests. Never reads DATABASE_URL. */
import { Client } from "pg";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir, userInfo } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createServer } from "node:net";
import assert from "node:assert/strict";

const root = fileURLToPath(new URL("../", import.meta.url));
const bin = process.env.BUMPIN_PG_BIN ?? "/opt/homebrew/opt/postgresql@17/bin";
const directory = await mkdtemp(join(tmpdir(), "bumpin-concierge-db-"));
const probe = createServer();
await new Promise((resolve) => probe.listen(0, "127.0.0.1", resolve));
const port = probe.address().port;
await new Promise((resolve) => probe.close(resolve));
const clients = [];
let started = false;
let passed = 0;
const user = randomUUID(),
  outsider = randomUUID();
async function connect(role, id) {
  const client = new Client({
    host: "127.0.0.1",
    port,
    database: "postgres",
    user: userInfo().username,
  });
  await client.connect();
  clients.push(client);
  if (role) await client.query(`set role ${role}`);
  if (id)
    await client.query("select set_config('request.jwt.claim.sub',$1,false)", [
      id,
    ]);
  return client;
}
async function check(name, run) {
  await run();
  passed++;
  console.log(`PASS ${name}`);
}
async function claim(client, kind = "voice") {
  return (
    await client.query(
      "select public.claim_concierge_quota('grok-bot-london',$1) as allowed",
      [kind],
    )
  ).rows[0].allowed;
}
try {
  execFileSync(
    join(bin, "initdb"),
    ["-D", directory, "--auth=trust", "--no-locale", "-E", "UTF8"],
    { stdio: "pipe" },
  );
  execFileSync(
    join(bin, "pg_ctl"),
    [
      "-D",
      directory,
      "-l",
      join(directory, "server.log"),
      "-o",
      `-p ${port} -h 127.0.0.1 -k ${directory} -c wal_level=logical`,
      "-w",
      "start",
    ],
    { stdio: "pipe" },
  );
  started = true;
  const admin = await connect();
  await admin.query(`create schema auth;create schema extensions;create extension pgcrypto with schema extensions;
    create role anon nologin;create role authenticated nologin;
    alter default privileges in schema public grant execute on functions to anon,authenticated;
    grant usage on schema public,auth,extensions to anon,authenticated;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create publication supabase_realtime;`);
  for (const file of [
    "20261022160000_init.sql",
    "20261022180000_venue_only_positions.sql",
    "20261022210000_concierge_quota.sql",
    "20261022230000_concierge_quota_grants.sql",
    "20261022240000_concierge_access.sql",
  ])
    await admin.query(
      await readFile(join(root, "supabase/migrations", file), "utf8"),
    );
  await admin.query("insert into auth.users(id) values($1),($2)", [
    user,
    outsider,
  ]);
  await admin.query(
    "insert into public.profiles(id,display_name,avatar_seed) values($1,'Test','test')",
    [user],
  );
  const event = (
    await admin.query(
      "select id from public.events where slug='grok-bot-london'",
    )
  ).rows[0].id;
  await admin.query(
    "insert into public.event_memberships(event_id,user_id,visible) values($1,$2,true)",
    [event, user],
  );
  const auth = await connect("authenticated", user),
    other = await connect("authenticated", outsider),
    anon = await connect("anon");
  const accessStatus = async (client) => (await client.query("select public.concierge_access_status('grok-bot-london') as status")).rows[0].status;
  const requestAccess = async (client) => (await client.query("select public.request_concierge_access('grok-bot-london') as status")).rows[0].status;
  await check("access requests require a visible membership and cannot grant approval", async () => {
    await assert.rejects(() => requestAccess(anon), /permission denied/);
    await assert.rejects(() => requestAccess(other), /membership required/);
    assert.equal(await accessStatus(auth), "required");
    assert.equal(await requestAccess(auth), "pending");
    assert.equal(await requestAccess(auth), "pending");
    assert.equal((await admin.query("select count(*)::int as n from public.concierge_access")).rows[0].n, 1);
    await assert.rejects(() => auth.query("update public.concierge_access set status='approved'"), /permission denied/);
    await assert.rejects(() => auth.query("select * from public.concierge_access"), /permission denied/);
  });
  await check("only server administration approves access and repeat requests cannot undo revocation", async () => {
    await admin.query("update public.concierge_access set status='approved' where user_id=$1", [user]);
    assert.equal(await accessStatus(auth), "approved");
    assert.equal(await requestAccess(auth), "approved");
    await admin.query("update public.concierge_access set status='revoked' where user_id=$1", [user]);
    assert.equal(await accessStatus(auth), "revoked");
    assert.equal(await requestAccess(auth), "revoked");
    await assert.rejects(() => accessStatus(other), /membership required/);
  });
  await check("anonymous and non-member calls are denied", async () => {
    await assert.rejects(() => claim(anon), /permission denied/);
    await assert.rejects(() => claim(other), /membership required/);
  });
  await check("client roles cannot read or forge counters", async () => {
    await assert.rejects(
      () => auth.query("select * from public.concierge_usage"),
      /permission denied/,
    );
    await assert.rejects(
      () => auth.query("delete from public.concierge_usage"),
      /permission denied/,
    );
  });
  await check("concurrent voice starts are limited atomically", async () => {
    const sessions = await Promise.all(
      Array.from({ length: 8 }, () => connect("authenticated", user)),
    );
    const result = await Promise.all(sessions.map((c) => claim(c)));
    assert.equal(result.filter(Boolean).length, 3);
    assert.equal(await claim(auth), false);
  });
  await check("search quotas are separate and reset next minute", async () => {
    assert.equal(await claim(auth, "search"), true);
    await admin.query(
      "update public.concierge_usage set bucket=bucket-interval '1 minute'",
    );
    assert.equal(await claim(auth), true);
  });
  await check("hidden and departed members cannot claim quota", async () => {
    await admin.query(
      "update public.event_memberships set visible=false where user_id=$1",
      [user],
    );
    await assert.rejects(() => claim(auth), /membership required/);
    await admin.query("delete from public.event_memberships where user_id=$1", [
      user,
    ]);
    await assert.rejects(() => claim(auth), /membership required/);
  });
  console.log(
    `${passed} concierge database scenarios passed in disposable PostgreSQL.`,
  );
} finally {
  await Promise.allSettled(clients.map((c) => c.end()));
  if (started)
    execFileSync(
      join(bin, "pg_ctl"),
      ["-D", directory, "-m", "immediate", "-w", "stop"],
      { stdio: "pipe" },
    );
  await rm(directory, { recursive: true, force: true });
}
