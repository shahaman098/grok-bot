/** Apply the two pending release migrations to the configured project, atomically. */
import { Client } from "pg";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
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
    "select pg_advisory_xact_lock(hashtext('bumpin-love-at-first-bot-release'))",
  );
  const {
    rows: [state],
  } = await db.query(
    "select to_regclass('public.profiles') is not null as profiles, to_regclass('public.connections') is not null as connections, exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='can_help_with') as offers, exists(select 1 from information_schema.triggers where trigger_schema='public' and trigger_name='membership_venue_position') as venue_protection",
  );
  if (!state.profiles)
    throw new Error("Apply the initial and guest-session migrations first");
  if (state.connections !== state.offers)
    throw new Error(
      "Partial introduction schema detected; inspect before proceeding",
    );
  const applied = [];
  if (!state.venue_protection) {
    const name = "20261022180000_venue_only_positions.sql";
    await db.query(
      await readFile(`${root}supabase/migrations/${name}`, "utf8"),
    );
    applied.push(name);
  }
  if (!state.connections) {
    const name = "20261022190000_love_at_first_bot.sql";
    await db.query(
      await readFile(`${root}supabase/migrations/${name}`, "utf8"),
    );
    applied.push(name);
  }
  await db.query("notify pgrst, 'reload schema'");
  await db.query("commit");
  console.log(
    applied.length
      ? `Applied atomically: ${applied.join(", ")}`
      : "Release migrations already present.",
  );
} catch (error) {
  await db.query("rollback").catch(() => {});
  console.error("Release migration failed:", error.code ?? error.message);
  process.exitCode = 1;
} finally {
  await db.end();
}
