/** Hosted profile-import persistence check with disposable synthetic members. */
import { Client } from "pg";
import { createServerClient } from "@supabase/ssr";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
const base = process.env.BUMPIN_TEST_APP_URL;
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!base || !url || !key || !process.env.DATABASE_URL) throw new Error("Configured app and database required");
const db = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 10000 });
const slug = `profile-import-qa-${randomUUID().slice(0, 8)}`;
const ids = [];
let eventId;
async function member(name) {
  const email = `qa-${randomUUID()}@bumpin.local`, password = randomUUID() + randomUUID();
  const { rows: [row] } = await db.query("select public.create_bumpin_guest($1,$2) as id", [email, password]);
  ids.push(row.id);
  await db.query("insert into public.profiles(id,display_name,avatar_seed,building,can_help_with,looking_for) values($1,$2,$2,'Event tools','Design','React')", [row.id, name]);
  await db.query("insert into public.event_memberships(event_id,user_id,visible) values($1,$2,true)", [eventId, row.id]);
  const response = await fetch(`${url}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: key, "Content-Type": "application/json" }, body: JSON.stringify({ email, password }), signal: AbortSignal.timeout(15000) });
  const token = await response.json();
  if (!response.ok || !token.access_token) throw new Error("Synthetic session exchange failed");
  const jar = new Map();
  const client = createServerClient(url, key, { cookies: { getAll: () => [...jar].map(([name, value]) => ({ name, value })), setAll: cookies => { for (const cookie of cookies) jar.set(cookie.name, cookie.value); } } });
  const result = await client.auth.setSession({ access_token: token.access_token, refresh_token: token.refresh_token });
  if (result.error || (await client.auth.getUser()).error) throw new Error("Synthetic session verification failed");
  return [...jar].map(([name, value]) => `${name}=${value}`).join("; ");
}
async function api(path, cookie, body, expected = 200) {
  const method = body === undefined ? "GET" : "PATCH";
  const headers = { ...(cookie ? { Cookie: cookie } : {}), ...(body !== undefined ? { Origin: new URL(base).origin, "Content-Type": "application/json" } : {}) };
  let status, data;
  if (process.env.BUMPIN_VERCEL_CURL === "1") {
    const args = ["curl", path, "--deployment", base, "--", "--silent", "--show-error", "--max-time", "20", "--request", method, "--write-out", "\n%{http_code}"];
    for (const [name, value] of Object.entries(headers)) args.push("--header", `${name}: ${value}`);
    if (body !== undefined) args.push("--data-raw", JSON.stringify(body));
    let output;
    try { output = execFileSync("vercel", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 40000 }); }
    catch { throw new Error("Hosted request failed; no credentials logged"); }
    const end = output.lastIndexOf("\n");
    status = Number(output.slice(end + 1)); data = JSON.parse(output.slice(0, end));
  } else {
    const response = await fetch(new URL(path, base), { method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(20000) });
    status = response.status; data = await response.json();
  }
  assert.equal(status, expected, `${method} ${path} status`);
  return data;
}
try {
  await db.connect();
  const { rows: [event] } = await db.query("insert into public.events(slug,name,venue_name,venue_lat,venue_lng,luma_url,starts_at,ends_at) values($1,'Disposable profile import QA','QA venue',51.49,-0.22,'https://example.com',now(),now()+interval '1 hour') returning id", [slug]);
  eventId = event.id;
  const alice = await member("Fictional import Alice"), bob = await member("Fictional import Bob");
  const profile = { headline: "Software engineer", about: "Builds accessible tools", skills: "React, TypeScript", experience: "Example Company", education: "Example University" };
  await api("/api/me", alice, { eventSlug: slug, professionalProfile: profile });
  const own = await api(`/api/me?eventSlug=${slug}`, alice);
  assert.deepEqual(own.profile.professionalProfile, profile);
  assert.equal(own.profile.canHelpWith, "Design"); assert.equal(own.profile.lookingFor, "React");
  console.log("PASS reviewed profile persists through a fresh API read while event offers/goals are preserved");
  const directory = await api(`/api/events/${slug}/attendees`, bob);
  assert.deepEqual(directory.attendees.find(person => !person.isSelf).professionalProfile, profile);
  for (const id of ids) assert.equal(JSON.stringify(directory).includes(id), false);
  assert.equal(JSON.stringify(directory).includes("@bumpin.local"), false);
  console.log("PASS another authenticated member sees only the shared professional projection");
  await api("/api/me", alice, { eventSlug: slug, professionalProfile: { ...profile, headline: "a".repeat(241) } }, 400);
  await api("/api/me", null, { eventSlug: slug, professionalProfile: profile }, 401);
  assert.deepEqual((await api(`/api/me?eventSlug=${slug}`, alice)).profile.professionalProfile, profile);
  console.log("PASS invalid and unauthenticated saves preserve the last confirmed profile");
  await api("/api/me", alice, { eventSlug: slug, professionalProfile: null });
  assert.equal((await api(`/api/events/${slug}/attendees`, bob)).attendees.find(person => !person.isSelf).professionalProfile, null);
  await api("/api/me", alice, { eventSlug: slug, professionalProfile: profile });
  await api("/api/me", alice, { eventSlug: slug, visible: false });
  assert.equal((await api(`/api/events/${slug}/attendees`, bob)).attendees.length, 1);
  console.log("PASS removal and hiding clear imported details from another member's directory");
} catch (error) {
  console.error("Profile import smoke failed:", error.code ?? error.message);
  process.exitCode = 1;
} finally {
  if (eventId) await db.query("delete from public.events where id=$1", [eventId]);
  if (ids.length) await db.query("delete from auth.users where id=any($1::uuid[])", [ids]);
  const { rows: [row] } = await db.query("select count(*)::int as count from public.events where slug=$1", [slug]);
  assert.equal(row.count, 0);
  console.log("Temporary profile-import event and synthetic identities removed.");
  await db.end();
}
