import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
export const privateHeaders = { "Cache-Control": "no-store" };
export async function authenticatedClient() {
  const client = await createClient();
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) return null;
  return client;
}
export function rpcFailure(error: { code?: string; message: string }) {
  const status = error.code === "42501" ? 403 : error.code === "40001" ? 409 : error.code === "22023" ? 400 : 503;
  return NextResponse.json({ error: status === 503 ? "Introductions are unavailable. Please retry." : error.message }, { status, headers: privateHeaders });
}
