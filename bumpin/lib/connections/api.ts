import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
export const privateHeaders = { "Cache-Control": "no-store" };
export async function authenticatedClient() {
  const client = await createClient();
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user) return null;
  return client;
}
export function rpcFailure(error: { code?: string; message: string }) {
  const status =
    error.code === "42501"
      ? 403
      : error.code === "40001"
        ? 409
        : error.code === "22023"
          ? 400
          : 503;
  return NextResponse.json(
    {
      error:
        status === 503
          ? "Introductions are unavailable. Please retry."
          : error.message,
    },
    { status, headers: privateHeaders },
  );
}

export function mutationGuard(request: Request) {
  const origin = request.headers.get("origin");
  if (origin) {
    const target = new URL(request.url);
    // Next may normalize request.url to localhost. Host retains the browser's
    // requested authority; Vercel supplies the original scheme through its proxy.
    const host = request.headers.get("host") ?? target.host;
    const protocol =
      request.headers.get("x-forwarded-proto")?.split(",")[0].trim() ??
      target.protocol.slice(0, -1);
    if (origin !== `${protocol}://${host}`)
      return NextResponse.json(
        { error: "Cross-origin mutations are not allowed" },
        { status: 403, headers: privateHeaders },
      );
  }
  if (
    !request.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("application/json")
  )
    return NextResponse.json(
      { error: "JSON content required" },
      { status: 415, headers: privateHeaders },
    );
  return null;
}
