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
    } catch {
      throw new Error(
        "Authenticated deployment request failed; no credentials logged",
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
  const { rows: [event] } = await db.query("insert into public.events(slug,name,venue_name,venue_lat,venue_lng,luma_url,starts_at,ends_at) values($1,'Disposable visibility QA','QA venue',51.49,-0.22,'https://example.com',now(),now()+interval '1 hour') returning id", [slug]);
  eventId=event.id;
  const alice=await session("Alice"), bob=await session("Bob");
  for(const cookie of [alice,bob]) {
    const {attendees}=await api(`/api/events/${slug}/attendees`,cookie);
    assert.equal(attendees.length,2);
    assert.equal(attendees.filter(a=>a.isSelf).length,1);
    assert.equal(attendees.filter(a=>!a.isSelf).length,1);
    assert.ok(attendees.every(a=>a.building && a.canHelpWith && a.lookingFor && Number.isFinite(a.displayLat) && Number.isFinite(a.displayLng)));
  }
  pass("both authenticated attendees receive their own and the other's full shared profile and venue marker");
  await api('/api/me',alice,'PATCH',{eventSlug:slug,visible:false});
  assert.equal((await api(`/api/events/${slug}/attendees`,bob)).attendees.length,1);
  assert.equal((await api(`/api/me?eventSlug=${slug}`,alice)).membership.visible,false);
  await api('/api/me',alice,'PATCH',{eventSlug:slug,visible:true});
  assert.equal((await api(`/api/events/${slug}/attendees`,bob)).attendees.length,2);
  pass("hide and restore update the other attendee's real directory");
  await api('/api/me',alice,'PATCH',{eventSlug:slug,linkedinUrl:'linkedin.com/in/example?trk=qa'});
  assert.equal((await api(`/api/events/${slug}/attendees`,bob)).attendees.find(a=>!a.isSelf).linkedinUrl,'https://www.linkedin.com/in/example');
  pass("supplied LinkedIn profile links are normalized and returned to the other attendee");
  await api('/api/me',alice,'PATCH',{eventSlug:slug,linkedinUrl:'https://example.com/in/invalid'},400);
  assert.equal((await api('/api/me?eventSlug='+slug,alice)).profile.linkedinUrl,'https://www.linkedin.com/in/example');
  await api('/api/me',alice,'PATCH',{eventSlug:slug,linkedinUrl:''});
  assert.equal((await api('/api/events/'+slug+'/attendees',bob)).attendees.find(a=>!a.isSelf).linkedinUrl,null);
  await api('/api/me',alice,'PATCH',{eventSlug:slug,linkedinUrl:'https://www.linkedin.com/in/example'});
  pass("invalid URLs preserve the last valid link and removal clears it for other attendees");
  const access = await api('/api/concierge/config?eventSlug='+slug,alice);
  assert.equal(access.voiceEnabled,false);
  assert.equal(access.access,'required');
  await api('/api/concierge/session',alice,'POST',{eventSlug:slug},403);
  pass("new members still require approval before paid concierge use");
  if(process.env.BUMPIN_VISIBILITY_BROWSER==='1') {
    const {chromium,devices,expect}=await import('@playwright/test');
    const browser=await chromium.launch({headless:true});
    try {
      const make=async cookie=>{
        const context=await browser.newContext({...devices['Pixel 7']});
        await context.addCookies(cookie.split('; ').map(part=>({name:part.slice(0,part.indexOf('=')),value:part.slice(part.indexOf('=')+1),url:base})));
        // The hosted page only permits the seeded event slug. Route this test
        // browser's API requests to the disposable event; responses and writes
        // still use the real hosted handlers, authentication and database.
        await context.route(`${base}/api/**`, async route=>{
          const request=route.request();
          const target=new URL(request.url());
          target.pathname=target.pathname.replace('/grok-bot-london','/'+slug);
          if(target.searchParams.get('eventSlug')==='grok-bot-london') target.searchParams.set('eventSlug',slug);
          let postData=request.postData()??undefined;
          if(postData && request.headers()['content-type']?.includes('application/json')) {
            const body=JSON.parse(postData);
            if(body.eventSlug==='grok-bot-london') body.eventSlug=slug;
            postData=JSON.stringify(body);
          }
          await route.continue({url:target.href,postData});
        });
        const page=await context.newPage();
        await page.goto(`${base}/e/grok-bot-london`);
        return page;
      };
      const a=await make(alice), b=await make(bob);
      await expect(a.getByText('2 on map',{exact:true})).toBeVisible();
      await expect(a.getByRole('button',{name:'Open profile for QA Fictional Alice',exact:true})).toContainText('You');
      await expect(b.getByRole('button',{name:'Open profile for QA Fictional Alice',exact:true})).toBeVisible();
      await a.getByRole('button',{name:'Open profile for QA Fictional Bob',exact:true}).click();
      await expect(a.getByRole('dialog').getByText('Product design',{exact:true})).toBeVisible();
      await a.getByRole('button',{name:'Close profile'}).click();
      await b.getByRole('button',{name:'Open profile for QA Fictional Alice',exact:true}).click();
      await expect(b.getByRole('dialog').getByText('React development',{exact:true})).toBeVisible();
      await expect(b.getByRole('link',{name:'View full LinkedIn profile'})).toHaveAttribute('href','https://www.linkedin.com/in/example');
      await b.getByRole('button',{name:'Close profile'}).click();
      await a.getByRole('button',{name:'Map',exact:true}).click();
      await expect(a.getByRole('button',{name:'Locate me',exact:true})).toBeEnabled({timeout:20000});
      await a.getByRole('button',{name:'Back to event venue'}).click();
      await expect(a.getByRole('button',{name:'Open profile for QA Fictional Alice',exact:true})).toBeInViewport();
      await expect(a.getByRole('button',{name:'Open profile for QA Fictional Bob',exact:true})).toBeInViewport();
      await a.screenshot({path:'/tmp/bumpin-live-attendee-visibility.png'});
      await a.getByRole('button',{name:'Visible',exact:true}).click();
      await expect(a.getByRole('button',{name:'Open profile for QA Fictional Alice',exact:true})).toHaveCount(0);
      await expect(b.getByRole('button',{name:'Open profile for QA Fictional Alice',exact:true})).toHaveCount(0,{timeout:10000});
      await a.getByRole('button',{name:'Hidden',exact:true}).click();
      await expect(b.getByRole('button',{name:'Open profile for QA Fictional Alice',exact:true})).toBeVisible({timeout:10000});
      pass("hosted UI with test-browser event routing shows both members, opens shared details, renders real map markers, and synchronizes visibility between two signed-in contexts");
    } finally {await browser.close()}
  }
  console.log(`${checks} visibility scenarios passed.`);
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
