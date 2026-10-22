/** Hosted API smoke test. Synthetic profiles in a temporary event; always cleaned up. */
import { Client } from "pg";
import { createServerClient } from "@supabase/ssr";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
const base = process.env.BUMPIN_TEST_APP_URL ?? "http://127.0.0.1:3109";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key || !process.env.DATABASE_URL)
  throw new Error("Configured Supabase environment required");
const db = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
});
const slug = `bumpin-qa-${randomUUID().slice(0, 8)}`;
const ids = [];
let eventId;
let checks = 0;
const pass = (message) => {
  checks++;
  console.log(`PASS ${message}`);
};
async function session(label) {
  const email = `qa-${randomUUID()}@bumpin.local`;
  const password = randomUUID() + randomUUID();
  const {
    rows: [row],
  } = await db.query("select public.create_bumpin_guest($1,$2) as id", [
    email,
    password,
  ]);
  ids.push(row.id);
  await db.query(
    "insert into public.profiles(id,display_name,avatar_seed,building,can_help_with,looking_for) values($1,$2,$3,'AI event tools',$4,$5)",
    [
      row.id,
      `QA Fictional ${label}`,
      label,
      label === "Alice" ? "React development" : "Product design",
      label === "Alice" ? "Product design" : "React developers",
    ],
  );
  await db.query(
    "insert into public.event_memberships(event_id,user_id,visible) values($1,$2,true)",
    [eventId, row.id],
  );
  const tokenRes = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: key, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    signal: AbortSignal.timeout(12000),
  });
  const token = await tokenRes.json();
  if (!tokenRes.ok || !token.access_token)
    throw new Error("Synthetic session exchange failed");
  const jar = new Map();
  const client = createServerClient(url, key, {
    cookies: {
      getAll() {
        return [...jar].map(([name, value]) => ({ name, value }));
      },
      setAll(cookies) {
        for (const c of cookies) jar.set(c.name, c.value);
      },
    },
  });
  const { error } = await client.auth.setSession({
    access_token: token.access_token,
    refresh_token: token.refresh_token,
  });
  if (error) throw new Error("Synthetic session cookie creation failed");
  const verified = await client.auth.getUser();
  if (verified.error || !verified.data.user)
    throw new Error(
      `Synthetic ${label} session validation failed: ${verified.error?.code ?? "missing user"}`,
    );
  console.log(
    `Synthetic ${label} session verified; ${jar.size} cookie chunks.`,
  );
  return [...jar].map(([name, value]) => `${name}=${value}`).join("; ");
}
async function api(path, cookie, method = "GET", body, status = 200) {
  const headers = {
    ...(cookie ? { Cookie: cookie } : {}),
    ...(body
      ? { "Content-Type": "application/json", Origin: new URL(base).origin }
      : {}),
  };
  let responseStatus;
  let value;
  if (process.env.BUMPIN_VERCEL_CURL === "1") {
    // Native CLI supplies protection bypass; this script never logs tokens.
    const args = [
      "curl",
      path,
      "--deployment",
      base,
      "--",
      "--silent",
      "--show-error",
      "--request",
      method,
      "--max-time",
      "20",
      "--write-out",
      "\n%{http_code}",
    ];
    for (const [name, value] of Object.entries(headers))
      args.push("--header", `${name}: ${value}`);
    if (body) args.push("--data-raw", JSON.stringify(body));
    let output;
    try {
      output = execFileSync("vercel", args, {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        timeout: 40000,
      });
    } catch (error) {
      const detail = error.code ?? error.status ?? error.signal ?? "unknown transport error";
      throw new Error(
        `Authenticated deployment request failed (${detail}); no credentials logged`,
      );
    }
    const separator = output.lastIndexOf("\n");
    responseStatus = Number(output.slice(separator + 1));
    try {
      value = JSON.parse(output.slice(0, separator));
    } catch {
      throw new Error(
        `Deployment returned a non-JSON response (${responseStatus})`,
      );
    }
  } else {
    const res = await fetch(`${base}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(15000),
    });
    value = await res.json();
    responseStatus = res.status;
  }
  assert.equal(
    responseStatus,
    status,
    `${method} ${path}: expected ${status}, received ${responseStatus}; ${value.error ?? ""}`,
  );
  return value;
}
try {
  await db.connect();
  const {
    rows: [event],
  } = await db.query(
    "insert into public.events(slug,name,venue_name,venue_lat,venue_lng,luma_url,starts_at,ends_at) values($1,'Disposable QA event','QA venue',51.49,-0.22,'https://example.com',now(),now()+interval '1 hour') returning id",
    [slug],
  );
  eventId = event.id;
  const alice = await session("Alice"),
    bob = await session("Bob");
  await db.query(
    "update public.event_memberships set visible=false where event_id=$1 and user_id=$2",
    [eventId, ids[0]],
  );
  await api("/api/join", alice, "POST", {
    eventSlug: slug,
    displayName: "QA Fictional Alice",
    avatarSeed: "Alice",
    building: "AI event tools",
    canHelpWith: "React development",
    lookingFor: "Product design",
    locationConsent: false,
  });
  const self = await api(`/api/me?eventSlug=${slug}`, alice);
  assert.equal(self.membership.visible, true);
  pass(
    "joining without a visibility field automatically appears on the venue map",
  );
  assert.equal(self.identity, null);
  assert.equal(self.profile.avatarUrl, null);
  assert.equal(self.profile.linkedinUrl, null);
  assert.equal(self.profile.displayName, "QA Fictional Alice");
  const provider = await api("/api/auth/linkedin");
  assert.equal(typeof provider.enabled, "boolean");
  pass(
    "hosted onboarding returns the own profile and actual provider availability",
  );
  const directory = await api(`/api/events/${slug}/attendees`, alice);
  assert.equal(directory.attendees.length, 2);
  for (const id of ids)
    assert.equal(JSON.stringify(directory).includes(id), false);
  pass("two independent hosted sessions see only safe attendee projections");
  const accessConfig = await api(`/api/concierge/config?eventSlug=${slug}`, alice);
  assert.equal(accessConfig.access, "required");
  assert.equal(accessConfig.voiceEnabled, false);
  await api("/api/concierge/session", alice, "POST", { eventSlug: slug }, 403);
  await api("/api/concierge/session", null, "POST", { eventSlug: slug }, 401);
  await api("/api/concierge/access", alice, "POST", { eventSlug: slug, status: "approved" }, 400);
  pass("public callers cannot obtain paid voice credentials or supply their own approval");
  const accessRequest = await api("/api/concierge/access", alice, "POST", { eventSlug: slug });
  assert.equal(accessRequest.access, "pending");
  assert.equal((await api("/api/concierge/access", alice, "POST", { eventSlug: slug })).access, "pending");
  assert.equal((await api(`/api/concierge/config?eventSlug=${slug}`, bob)).access, "required");
  await api("/api/concierge/session", alice, "POST", { eventSlug: slug }, 403);
  const basic = await api("/api/concierge/search", alice, "POST", { eventSlug: slug, query: "Product design" });
  assert.equal(basic.source, "rules");
  assert.equal(basic.matches[0].displayName, "QA Fictional Bob");
  pass("access requests remain pending and isolated while free basic matching works");
  await db.query("update public.concierge_access set status='approved' where event_id=$1 and user_id=$2", [eventId, ids[0]]);
  assert.equal((await api(`/api/concierge/config?eventSlug=${slug}`, alice)).access, "approved");
  if (process.env.BUMPIN_LIVE_CONCIERGE_QA === "1") {
    assert.equal((await api(`/api/concierge/config?eventSlug=${slug}`, alice)).voiceEnabled, true);
    const semantic = await api("/api/concierge/search", alice, "POST", {
      eventSlug: slug, query: "Who could help me improve user experience and interface design? Exclude React programming.",
    });
    assert.equal(semantic.source, "grok", "Expected a real semantic provider result, not a fallback");
    assert.equal(semantic.matches[0].displayName, "QA Fictional Bob");
    const safeFields = { canHelpWith: "Product design", building: "AI event tools", lookingFor: "React developers" };
    const verifiedBob = (result) => {
      assert.equal(result.source, "grok", "Expected real semantic matching, not fallback");
      assert.equal(result.matches[0].displayName, "QA Fictional Bob");
      assert.ok(result.matches[0].evidence.length >= 1);
      for (const evidence of result.matches[0].evidence)
        assert.ok(safeFields[evidence.profileField]?.includes(evidence.theirExcerpt), "Evidence must quote the exact candidate field");
    };
    verifiedBob(semantic);
    const combined = await api("/api/concierge/search", alice, "POST", {
      eventSlug: slug, query: "Who offers product design help and is building AI event tools?",
    });
    verifiedBob(combined);
    assert.deepEqual(combined.matches[0].evidence.map((e) => e.profileField), ["canHelpWith", "building"]);
    const personalized = await api("/api/concierge/search", alice, "POST", {
      eventSlug: slug, query: "Who should I meet?",
    });
    verifiedBob(personalized);
    const voice = await api("/api/concierge/session", alice, "POST", { eventSlug: slug });
    assert.equal(typeof voice.token, "string");
    assert.ok(voice.token.length > 10);
    assert.equal(voice.model, "grok-voice-3.0");
    assert.ok(voice.expiresAt > Date.now() / 1000);
    pass("approved attendee receives real xAI personalized/multi-field evidence and a short-lived voice credential; secrets withheld");
  }
  await db.query("update public.concierge_access set status='revoked' where event_id=$1 and user_id=$2", [eventId, ids[0]]);
  assert.equal((await api("/api/concierge/access", alice, "POST", { eventSlug: slug })).access, "revoked");
  await api("/api/concierge/session", alice, "POST", { eventSlug: slug }, 403);
  pass("owner approval and revocation are enforced by the hosted API without contacting xAI");
  const results = await api("/api/recommend", alice, "POST", {
    eventSlug: slug,
  });
  assert.equal(results.matches[0].category, "mutual");
  assert.equal(results.source, "rules");
  assert.equal(results.matches[0].displayName, "QA Fictional Bob");
  pass("hosted profile matching returns complementary evidence");
  const { connection } = await api("/api/connections", alice, "POST", {
    eventSlug: slug,
    targetMembershipId: results.matches[0].membershipId,
  });
  const incoming = await api(`/api/connections?eventSlug=${slug}`, bob);
  assert.equal(incoming.connections[0].id, connection.id);
  assert.equal(incoming.connections[0].role, "recipient");
  await api(
    `/api/connections/${connection.id}`,
    alice,
    "PATCH",
    { action: "accept" },
    403,
  );
  await api(`/api/connections/${connection.id}`, bob, "PATCH", {
    action: "accept",
  });
  pass("hosted API enforces recipient-only acceptance across sessions");
  const { connection: edited } = await api(
    `/api/connections/${connection.id}`,
    alice,
    "PATCH",
    { action: "chooseJoke", jokeId: "tabs" },
  );
  const stagePath = `/api/stage/${slug}/${connection.id}`;
  assert.equal((await api(stagePath)).snapshot, null);
  await api(`/api/connections/${connection.id}`, alice, "PATCH", {
    action: "approveStage",
    expectedRevision: edited.revision,
  });
  assert.equal((await api(stagePath)).snapshot, null);
  await api(`/api/connections/${connection.id}`, bob, "PATCH", {
    action: "approveStage",
    expectedRevision: edited.revision,
  });
  const { snapshot } = await api(stagePath);
  assert.equal(snapshot.people[0].displayName, "QA Fictional Alice");
  assert.match(snapshot.jokes[0], /47 open tabs/);
  assert.equal(Object.hasOwn(snapshot, "conversationStarter"), false);
  for (const secret of [...ids, "linkedin", "sender_id", "recipient_id"])
    assert.equal(JSON.stringify(snapshot).includes(secret), false);
  pass("anonymous hosted stage reveals only the mutually approved snapshot");
  await api(`/api/connections/${connection.id}`, bob, "PATCH", {
    action: "revokeStage",
  });
  assert.equal((await api(stagePath)).snapshot, null);
  pass("hosted consent withdrawal clears public stage access");
  await api("/api/me", alice, "PATCH", {
    eventSlug: slug,
    canHelpWith: "React development and testing",
  });
  const me = await api(`/api/me?eventSlug=${slug}`, alice);
  assert.equal(me.profile.canHelpWith, "React development and testing");
  const updated = await api(`/api/connections?eventSlug=${slug}`, bob);
  assert.equal(updated.connections[0].otherStageApproved, false);
  pass("hosted profile edits clear stage approvals and return the own profile");
  await api("/api/me", alice, "PATCH", { eventSlug: slug, visible: false });
  const hidden = await api(`/api/me?eventSlug=${slug}`, alice);
  assert.equal(hidden.membership.visible, false);
  assert.ok(hidden.profile.canHelpWith);
  const remaining = await api(`/api/connections?eventSlug=${slug}`, bob);
  assert.equal(remaining.connections[0].status, "withdrawn");
  assert.equal((await api(stagePath)).snapshot, null);
  pass("hidden membership remains editable and invalidates introductions");
  console.log(`${checks} hosted API scenarios passed.`);
} catch (error) {
  console.error("Configured smoke test failed:", error.message);
  process.exitCode = 1;
} finally {
  if (eventId)
    await db.query("delete from public.events where id=$1", [eventId]);
  if (ids.length)
    await db.query("delete from auth.users where id=any($1::uuid[])", [ids]);
  const {
    rows: [remaining],
  } = await db.query(
    "select count(*)::int as count from public.events where slug=$1",
    [slug],
  );
  assert.equal(remaining.count, 0);
  console.log(
    "Temporary QA event, profiles, connections and auth identities removed.",
  );
  await db.end();
}
