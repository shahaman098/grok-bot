/** Disposable PostgreSQL bot connector tests. Never reads DATABASE_URL. */
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
const directory = await mkdtemp(join(tmpdir(), "bumpin-bot-db-"));
const probe = createServer();
await new Promise((resolve) => probe.listen(0, "127.0.0.1", resolve));
const port = probe.address().port;
await new Promise((resolve) => probe.close(resolve));
const clients = [];
let started = false;
let passed = 0;
const [user, other, hidden, outsider] = Array.from({length:4},()=>randomUUID());
async function mint(c, slug='grok-bot-london') {
  return (await c.query('select public.create_bot_access($1) as value',[slug])).rows[0].value;
}
async function read(c, token) {
  return (await c.query('select public.read_bot_context($1) as value',[token])).rows[0].value;
}
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
    grant usage on schema public,auth,extensions to anon,authenticated;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create publication supabase_realtime;`);
  for (const file of [
    "20261022160000_init.sql",
    "20261022180000_venue_only_positions.sql",
    "20261022190000_love_at_first_bot.sql",
    "20261022220000_bot_connector.sql",
  ])
    await admin.query(
      await readFile(join(root, "supabase/migrations", file), "utf8"),
    );

  for (const [id,name] of [[user,'Self'],[other,'Other'],[hidden,'Hidden'],[outsider,'Outsider']]) {
    await admin.query('insert into auth.users(id) values($1)',[id]);
    await admin.query('insert into public.profiles(id,display_name,avatar_seed) values($1,$2,$2)',[id,name]);
  }
  const event=(await admin.query("select id from public.events where slug='grok-bot-london'")).rows[0].id;
  const second=randomUUID();
  await admin.query("insert into public.events(id,slug,name,venue_name,venue_lat,venue_lng,luma_url,starts_at,ends_at) values($1,'second','Second','Venue',0,0,'https://example.test',now(),now()+interval '1 hour')",[second]);
  for(const [id,visible] of [[user,true],[other,true],[hidden,false]])
    await admin.query('insert into public.event_memberships(event_id,user_id,visible) values($1,$2,$3)',[event,id,visible]);
  await admin.query('insert into public.event_memberships(event_id,user_id,visible) values($1,$2,true)',[second,outsider]);
  const auth=await connect('authenticated',user), anon=await connect('anon'), otherAuth=await connect('authenticated',other), stranger=await connect('authenticated',outsider);
  let token;
  await check('anonymous, hidden and wrong-event callers cannot mint access',async()=>{
    await assert.rejects(()=>mint(anon),/permission denied/);
    await assert.rejects(()=>mint(stranger),/Become visible/);
    const h=await connect('authenticated',hidden);
    await assert.rejects(()=>mint(h),/Become visible/);
  });
  await check('scoped tokens are random, hashed and expire after one hour',async()=>{
    const value=await mint(auth); token=value.token;
    assert.match(token,/^[a-f0-9]{64}$/);
    assert.ok(new Date(value.expiresAt).getTime()>Date.now()+3590000);
    const row=(await admin.query('select * from public.bot_access')).rows[0];
    assert.notEqual(row.token_hash,token);
    await assert.rejects(()=>auth.query('select * from public.bot_access'),/permission denied/);
    await assert.rejects(()=>auth.query('delete from public.bot_access'),/permission denied/);
  });
  await check('context filters hidden and other-event profiles and private fields',async()=>{
    const context=await read(anon,token);
    assert.equal(context.eventSlug,'grok-bot-london');
    assert.deepEqual(context.attendees.map(p=>p.displayName).sort(),['Other','Self']);
    assert.equal(context.attendees.filter(p=>p.isSelf).length,1);
    for(const person of context.attendees)
      assert.deepEqual(Object.keys(person).sort(),['building','canHelpWith','displayName','isSelf','lookingFor','membershipId'].sort());
    await assert.rejects(()=>read(anon,'f'.repeat(64)),/Invalid or expired/);
  });
  await check('rotation invalidates the old token and another member cannot revoke it',async()=>{
    const next=await mint(auth);
    await assert.rejects(()=>read(anon,token),/Invalid or expired/); token=next.token;
    await otherAuth.query("select public.revoke_bot_access('grok-bot-london')");
    assert.equal((await read(anon,token)).attendees.length,2);
  });
  await check('expiry and explicit revocation fail closed',async()=>{
    await admin.query("update public.bot_access set expires_at=now()-interval '1 second'");
    await assert.rejects(()=>read(anon,token),/Invalid or expired/);
    token=(await mint(auth)).token;
    await auth.query("select public.revoke_bot_access('grok-bot-london')");
    await assert.rejects(()=>read(anon,token),/Invalid or expired/);
  });
  await check('hiding permanently revokes the credential, even after becoming visible',async()=>{
    token=(await mint(auth)).token;
    await admin.query('update public.event_memberships set visible=false where user_id=$1',[user]);
    await assert.rejects(()=>read(anon,token),/Invalid or expired/);
    await admin.query('update public.event_memberships set visible=true where user_id=$1',[user]);
    await assert.rejects(()=>read(anon,token),/Invalid or expired/);
  });
  await check('leaving removes event access',async()=>{
    token=(await mint(auth)).token;
    await admin.query('delete from public.event_memberships where user_id=$1',[user]);
    await assert.rejects(()=>read(anon,token),/Invalid or expired/);
  });
  console.log(`${passed} bot connector database scenarios passed in disposable PostgreSQL.`);
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
