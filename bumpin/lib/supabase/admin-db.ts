import { Client } from "pg";

export function getAdminDbClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured");
  }
  return new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });
}
