/** Disposable local PostgreSQL integration tests. Never reads DATABASE_URL. */
import { Client } from "pg";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir, userInfo } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID, createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createServer } from "node:net";
import assert from "node:assert/strict";
const root = fileURLToPath(new URL("../", import.meta.url));
const bin = process.env.BUMPIN_PG_BIN ?? "/opt/homebrew/opt/postgresql@17/bin";
const dir = await mkdtemp(join(tmpdir(), "bumpin-love-db-"));
const probe = createServer();
await new Promise((resolve) => probe.listen(0, "127.0.0.1", resolve));
const port = probe.address().port;
await new Promise((resolve) => probe.close(resolve));
const clients = [];
let started = false;
let count = 0;
const ids = Array.from({ length: 5 }, () => randomUUID());
const digest = (id) => createHash("sha256").update(id).digest("hex");
const payload = {
  category: "mutual",
  evidence: [
    {
      direction: "they-help-you",
      terms: ["design"],
      yourExcerpt: "Design",
      theirExcerpt: "Design",
    },
  ],
  conversationStarter: "What could we build together?",
  suggestedTask: "Spend ten minutes sketching one experiment.",
};
const contentFor = (i) =>
  i % 2
    ? {
        ...payload,
        evidence: [
          {
            direction: "they-help-you",
            terms: ["development"],
            yourExcerpt: "Development",
            theirExcerpt: "Development",
          },
        ],
      }
    : payload;
async function connect(role, id) {
  const c = new Client({
    host: "127.0.0.1",
    port,
    database: "postgres",
    user: userInfo().username,
  });
  await c.connect();
  clients.push(c);
  if (role) await c.query(`set role ${role}`);
  if (id)
    await c.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  return c;
}
async function rpc(c, name, args) {
  return (
    await c.query(
      `select public.${name}(${args.map((_, i) => `$${i + 1}`).join(",")}) as value`,
      args,
    )
  ).rows[0]?.value;
}
async function test(name, fn) {
  await fn();
  count++;
  console.log(`PASS ${name}`);
}
try {
  execFileSync(
    join(bin, "initdb"),
    ["-D", dir, "--auth=trust", "--no-locale", "-E", "UTF8"],
    { stdio: "pipe" },
  );
  execFileSync(
    join(bin, "pg_ctl"),
    [
      "-D",
      dir,
      "-l",
      join(dir, "server.log"),
      "-o",
      `-p ${port} -h 127.0.0.1 -k ${dir} -c wal_level=logical`,
      "-w",
      "start",
    ],
    { stdio: "pipe" },
  );
  started = true;
  const admin = await connect();
  await admin.query(`create schema auth; create schema extensions; create extension pgcrypto with schema extensions;
    create role anon nologin; create role authenticated nologin;
    grant usage on schema public,auth,extensions to anon,authenticated;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create publication supabase_realtime;`);
  for (const file of [
    "20261022160000_init.sql",
    "20261022170000_guest_session.sql",
    "20261022180000_venue_only_positions.sql",
    "20261022190000_love_at_first_bot.sql",
    "20261022200000_linkedin_onboarding.sql",
  ])
    await admin.query(
      await readFile(join(root, "supabase/migrations", file), "utf8"),
    );
  await admin.query(
    "grant select,insert,update,delete on public.profiles,public.event_memberships to authenticated; grant select on public.events to authenticated",
  );
  const {
    rows: [event],
  } = await admin.query(
    "select id from public.events where slug='grok-bot-london'",
  );
  await admin.query(
    "insert into public.events(id,slug,name,venue_name,venue_lat,venue_lng,luma_url,starts_at,ends_at) select gen_random_uuid(),'other-event',name,venue_name,venue_lat,venue_lng,luma_url,starts_at,ends_at from public.events limit 1",
  );
  const otherEvent = (
    await admin.query("select id from public.events where slug='other-event'")
  ).rows[0].id;
  for (let i = 0; i < ids.length; i++) {
    await admin.query("insert into auth.users(id) values($1)", [ids[i]]);
    await admin.query(
      "insert into public.profiles(id,display_name,avatar_seed,can_help_with,looking_for,linkedin_url) values($1,$2,'avatar',$3,$4,'https://www.linkedin.com/in/private')",
      [
        ids[i],
        `Person ${i}`,
        i % 2 ? "Design" : "Development",
        i % 2 ? "Development" : "Design",
      ],
    );
    await admin.query(
      "insert into public.event_memberships(event_id,user_id,visible) values($1,$2,true)",
      [i === 4 ? otherEvent : event.id, ids[i]],
    );
  }
  const [a, b, c, d, outsider] = await Promise.all(
    ids.map((id) => connect("authenticated", id)),
  );
  const anon = await connect("anon");
  await test("identity photos obey CDN constraints and event/visibility access", async () => {
    await a.query(
      "update public.profiles set avatar_url=$1 where id=auth.uid()",
      ["https://media.licdn.com/photo"],
    );
    const directory = await b.query(
      "select * from public.list_event_attendees('grok-bot-london')",
    );
    assert.equal(
      directory.rows.find((row) => row.membership_id === digest(ids[0]))
        .avatar_url,
      "https://media.licdn.com/photo",
    );
    assert.equal(
      directory.rows.some((row) => row.membership_id === digest(ids[4])),
      false,
    );
    await assert.rejects(
      a.query(
        "update public.profiles set avatar_url='https://licdn.com.attacker.test/photo' where id=auth.uid()",
      ),
      /check constraint/,
    );
    await assert.rejects(
      anon.query(
        "select * from public.list_event_attendees('grok-bot-london')",
      ),
      /permission denied/,
    );
    await a.query(
      "update public.event_memberships set visible=false where user_id=auth.uid()",
    );
    const hidden = await b.query(
      "select * from public.list_event_attendees('grok-bot-london')",
    );
    assert.equal(
      hidden.rows.some((row) => row.membership_id === digest(ids[0])),
      false,
    );
    await a.query(
      "update public.event_memberships set visible=true where user_id=auth.uid()",
    );
  });
  let first;
  await test("rejects unauthenticated, self and cross-event requests", async () => {
    await assert.rejects(
      rpc(anon, "create_connection", [
        "grok-bot-london",
        digest(ids[1]),
        payload,
      ]),
      /permission denied/,
    );
    await assert.rejects(
      rpc(a, "create_connection", ["grok-bot-london", digest(ids[0]), payload]),
      /unavailable/,
    );
    await assert.rejects(
      rpc(a, "create_connection", ["grok-bot-london", digest(ids[4]), payload]),
      /unavailable/,
    );
    await assert.rejects(
      rpc(a, "create_connection", [
        "grok-bot-london",
        digest(ids[1]),
        { ...payload, evidence: null },
      ]),
      /evidence/,
    );
  });
  await test("creates one request per unordered event pair", async () => {
    first = await rpc(a, "create_connection", [
      "grok-bot-london",
      digest(ids[1]),
      payload,
    ]);
    const duplicate = await rpc(b, "create_connection", [
      "grok-bot-london",
      digest(ids[0]),
      contentFor(1),
    ]);
    assert.equal(first.id, duplicate.id);
    assert.equal(duplicate.role, "recipient");
    assert.equal(JSON.stringify(first).includes(ids[1]), false);
    assert.equal(JSON.stringify(first).includes("linkedin"), false);
  });
  await test("raw records and private requests are inaccessible to outsiders", async () => {
    await assert.rejects(
      outsider.query("select * from public.connections"),
      /permission denied/,
    );
    assert.equal(
      (
        await outsider.query(
          "select * from public.list_connections('grok-bot-london')",
        )
      ).rowCount,
      0,
    );
    await assert.rejects(
      rpc(outsider, "update_connection", [first.id, "accept", null, null]),
      /unavailable/,
    );
  });
  await test("only recipient accepts; invalid writes leave state unchanged", async () => {
    await assert.rejects(
      rpc(a, "update_connection", [first.id, "accept", null, null]),
      /recipient/,
    );
    assert.equal(
      (
        await a.query(
          "select * from public.list_connections('grok-bot-london')",
        )
      ).rows[0].list_connections.status,
      "pending",
    );
    await assert.rejects(
      rpc(b, "update_connection", [first.id, "withdraw", null, null]),
      /sender/,
    );
    assert.equal(
      (await rpc(b, "update_connection", [first.id, "accept", null, null]))
        .status,
      "accepted",
    );
  });
  await test("stage requires both approvals and strips contact/auth data", async () => {
    assert.equal(
      await rpc(anon, "stage_connection", ["grok-bot-london", first.id]),
      null,
    );
    await rpc(a, "update_connection", [first.id, "approveStage", null, 1]);
    assert.equal(
      await rpc(anon, "stage_connection", ["grok-bot-london", first.id]),
      null,
    );
    await rpc(b, "update_connection", [first.id, "approveStage", null, 1]);
    const stage = await rpc(anon, "stage_connection", [
      "grok-bot-london",
      first.id,
    ]);
    assert.equal(stage.people.length, 2);
    assert.equal(Object.hasOwn(stage, "conversationStarter"), false);
    for (const secret of [
      ...ids,
      "linkedin",
      "recipient_id",
      "sender_id",
      "licdn.com",
      "avatar_url",
    ])
      assert.equal(JSON.stringify(stage).includes(secret), false);
  });
  await test("joke edits reset both approvals; stale versions cannot publish", async () => {
    const changed = await rpc(a, "update_connection", [
      first.id,
      "chooseJoke",
      "tabs",
      null,
    ]);
    assert.equal(changed.ownStageApproved, false);
    assert.equal(changed.otherStageApproved, false);
    assert.match(changed.snapshot.jokes[0], /47 open tabs/);
    await assert.rejects(
      rpc(b, "update_connection", [first.id, "approveStage", null, 1]),
      /Preview changed/,
    );
    assert.equal(
      await rpc(anon, "stage_connection", ["grok-bot-london", first.id]),
      null,
    );
    await rpc(a, "update_connection", [first.id, "approveStage", null, 2]);
    await rpc(b, "update_connection", [first.id, "approveStage", null, 2]);
    await rpc(b, "update_connection", [first.id, "revokeStage", null, null]);
    assert.equal(
      await rpc(anon, "stage_connection", ["grok-bot-london", first.id]),
      null,
    );
  });
  await test("profile edits revoke approval; hidden users cannot receive requests", async () => {
    await rpc(b, "update_connection", [first.id, "approveStage", null, 2]);
    await a.query(
      "update public.profiles set can_help_with='Design and React' where id=auth.uid()",
    );
    assert.equal(
      await rpc(anon, "stage_connection", ["grok-bot-london", first.id]),
      null,
    );
    await a.query(
      "update public.event_memberships set visible=false where user_id=auth.uid()",
    );
    assert.equal(
      (
        await b.query(
          "select * from public.list_connections('grok-bot-london')",
        )
      ).rows[0].list_connections.status,
      "withdrawn",
    );
    await assert.rejects(
      rpc(c, "create_connection", ["grok-bot-london", digest(ids[0]), payload]),
      /unavailable/,
    );
  });
  let simultaneous;
  await test("simultaneous opposite requests and approvals remain atomic", async () => {
    const pair = await Promise.all([
      rpc(c, "create_connection", ["grok-bot-london", digest(ids[3]), payload]),
      rpc(d, "create_connection", [
        "grok-bot-london",
        digest(ids[2]),
        contentFor(3),
      ]),
    ]);
    assert.equal(pair[0].id, pair[1].id);
    simultaneous = pair[0];
    const recipient = pair[0].role === "recipient" ? c : d;
    await rpc(recipient, "update_connection", [
      simultaneous.id,
      "accept",
      null,
      null,
    ]);
    await Promise.all([
      rpc(c, "update_connection", [simultaneous.id, "approveStage", null, 1]),
      rpc(d, "update_connection", [simultaneous.id, "approveStage", null, 1]),
    ]);
    assert.notEqual(
      await rpc(anon, "stage_connection", ["grok-bot-london", simultaneous.id]),
      null,
    );
  });
  await test("leaving cascades connections and stage consent", async () => {
    await c.query(
      "delete from public.event_memberships where user_id=auth.uid()",
    );
    assert.equal(
      await rpc(anon, "stage_connection", ["grok-bot-london", simultaneous.id]),
      null,
    );
    assert.equal(
      (
        await d.query(
          "select * from public.list_connections('grok-bot-london')",
        )
      ).rowCount,
      0,
    );
  });
  console.log(
    `${count} database integration scenarios passed in disposable PostgreSQL.`,
  );
} finally {
  await Promise.allSettled(clients.map((c) => c.end()));
  if (started)
    execFileSync(
      join(bin, "pg_ctl"),
      ["-D", dir, "-m", "immediate", "-w", "stop"],
      { stdio: "pipe" },
    );
  await rm(dir, { recursive: true, force: true });
}
