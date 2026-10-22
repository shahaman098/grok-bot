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
    "select to_regprocedure('public.read_bot_context(text)') as installed",
  );
  if (existing.rows[0].installed)
    console.log("Bot connector migration is already installed.");
  else {
    await client.query("begin");
    try {
      await client.query(
        await readFile(
          new URL(
            "../supabase/migrations/20261022220000_bot_connector.sql",
            import.meta.url,
          ),
          "utf8",
        ),
      );
      await client.query("notify pgrst, 'reload schema'");
      await client.query("commit");
      console.log("Bot connector migration applied.");
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  }
} finally {
  await client.end();
}
