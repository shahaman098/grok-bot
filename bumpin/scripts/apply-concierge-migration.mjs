/** Explicit setup command; apply only after reviewing the target DATABASE_URL. */
import { Client } from "pg";
import { readFile } from "node:fs/promises";
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not configured");
const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});
try {
  await client.connect();
  const existing = await client.query(
    "select to_regprocedure('public.claim_concierge_quota(text,text)') as installed",
  );
  await client.query("begin");
  try {
    if (!existing.rows[0].installed) {
      await client.query(
        await readFile(
          new URL(
            "../supabase/migrations/20261022210000_concierge_quota.sql",
            import.meta.url,
          ),
          "utf8",
        ),
      );
    }
    await client.query(await readFile(new URL(
      "../supabase/migrations/20261022230000_concierge_quota_grants.sql",
      import.meta.url,
    ), "utf8"));
    const access = await client.query("select to_regclass('public.concierge_access') as installed");
    if (!access.rows[0].installed)
      await client.query(await readFile(new URL(
        "../supabase/migrations/20261022240000_concierge_access.sql",
        import.meta.url,
      ), "utf8"));
    await client.query("notify pgrst, 'reload schema'");
    await client.query("commit");
    console.log("Concierge quota, access-request schema and restricted grants applied.");
  } catch (error) {
    await client.query("rollback");
    throw error;
  }
} finally {
  await client.end();
}
