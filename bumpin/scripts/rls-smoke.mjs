/**
 * Smoke-check: seed event exists; RPC exists; guest mint + password login works.
 * Reports actual outcomes (AGENTS.md).
 */
import { Client } from "pg";
import { randomUUID } from "crypto";

const url = process.env.DATABASE_URL;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !supabaseUrl || !key) {
  console.error("FAIL: missing DATABASE_URL or Supabase public env");
  process.exit(1);
}

const client = new Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
});

await client.connect();

const { rows: events } = await client.query(
  "select slug from public.events where slug = $1",
  ["grok-bot-london"],
);
console.log("events.grok-bot-london:", events.length === 1 ? "OK" : "FAIL");

const { rows: fn } = await client.query(
  "select proname from pg_proc where proname = 'list_event_attendees'",
);
console.log("rpc.list_event_attendees:", fn.length ? "OK" : "FAIL");

const email = `rls-${randomUUID().replace(/-/g, "")}@bumpin.local`;
const password = randomUUID().replace(/-/g, "");
await client.query("select public.create_bumpin_guest($1, $2)", [
  email,
  password,
]);

const tokenRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
  method: "POST",
  headers: { apikey: key, "Content-Type": "application/json" },
  body: JSON.stringify({ email, password }),
});
const token = await tokenRes.json();
console.log(
  "guest.password_login:",
  token.access_token ? "OK" : `FAIL ${JSON.stringify(token)}`,
);

// Hidden members should not be readable via RPC for another user — call as guest with no membership
const rpcRes = await fetch(
  `${supabaseUrl}/rest/v1/rpc/list_event_attendees`,
  {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${token.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ p_event_slug: "grok-bot-london" }),
  },
);
const rpcBody = await rpcRes.json();
console.log(
  "rpc.without_membership_returns_empty:",
  Array.isArray(rpcBody) && rpcBody.length === 0 ? "OK" : JSON.stringify(rpcBody),
);

await client.end();
process.exit(token.access_token && events.length === 1 && fn.length ? 0 : 1);
