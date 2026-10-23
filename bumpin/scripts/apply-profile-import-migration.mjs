/** Apply the additive professional-profile migration to the configured database. */
import { Client } from "pg";
import { readFile } from "node:fs/promises";
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const db = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 10000 });
try {
  await db.connect();
  await db.query("begin; set local lock_timeout='5s'; set local statement_timeout='20s'");
  await db.query("select pg_advisory_xact_lock(hashtext('bumpin-profile-import-release'))");
  await db.query(await readFile(new URL("../supabase/migrations/20261022250000_professional_profile.sql", import.meta.url), "utf8"));
  await db.query("commit");
  console.log("Professional profile migration applied atomically.");
} catch (error) {
  await db.query("rollback").catch(() => {});
  console.error("Profile migration failed:", error.code ?? "database error");
  process.exitCode = 1;
} finally { await db.end(); }
