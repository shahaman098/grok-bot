/** Owner-only administration through DATABASE_URL, never exposed as an HTTP API. */
import { Client } from "pg";
const [action = "list", requestId] = process.argv.slice(2);
if (!["list", "approve", "revoke"].includes(action) ||
    (action !== "list" && !/^[0-9a-f-]{36}$/i.test(requestId ?? "")))
  throw new Error("Usage: concierge-access.mjs list | approve <request-id> | revoke <request-id>");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
try {
  await client.connect();
  if (action === "list") {
    const { rows } = await client.query(`select a.id as request_id,e.slug as event,p.display_name,a.status,a.created_at
      from public.concierge_access a join public.events e on e.id=a.event_id
      join public.profiles p on p.id=a.user_id order by a.created_at desc limit 100`);
    console.table(rows);
  } else {
    const result = await client.query("update public.concierge_access set status=$1,updated_at=now() where id=$2 returning id,status",
      [action === "approve" ? "approved" : "revoked", requestId]);
    if (!result.rowCount) throw new Error("Access request not found");
    console.log(`${action === "approve" ? "Approved" : "Revoked"} request ${requestId}.`);
  }
} finally { await client.end(); }
