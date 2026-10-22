/** Apply only the LinkedIn onboarding migration, atomically. */
import { Client } from "pg";
import { readFile } from "node:fs/promises";
const name = "20261022200000_linkedin_onboarding.sql";
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const db = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
});
try {
  await db.connect();
  await db.query(
    "begin; set local lock_timeout='5s'; set local statement_timeout='20s'",
  );
  await db.query(
    "select pg_advisory_xact_lock(hashtext('bumpin-linkedin-onboarding-release'))",
  );
  const {
    rows: [state],
  } = await db.query(
    "select to_regclass('public.connections') is not null as connections, exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='can_help_with') as offers",
  );
  if (!state.connections || !state.offers)
    throw new Error("Apply existing Love at First Bot migrations first");
  await db.query(
    await readFile(
      new URL(`../supabase/migrations/${name}`, import.meta.url),
      "utf8",
    ),
  );
  await db.query("commit");
  console.log(`Applied atomically: ${name}`);
} catch (error) {
  await db.query("rollback").catch(() => {});
  console.error("Onboarding migration failed:", error.code ?? error.message);
  process.exitCode = 1;
} finally {
  await db.end();
}
