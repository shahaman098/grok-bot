import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { getAdminDbClient } from "@/lib/supabase/admin-db";

/**
 * Mint a confirmed guest session without Anonymous Auth.
 * Creates auth.users via SQL, then exchanges password for tokens via GoTrue.
 */
export async function POST() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    return NextResponse.json(
      { error: "Supabase env not configured" },
      { status: 503 },
    );
  }

  const email = `guest-${randomUUID().replace(/-/g, "")}@bumpin.local`;
  const password = randomUUID().replace(/-/g, "");

  const client = getAdminDbClient();
  try {
    await client.connect();
    await client.query("select public.create_bumpin_guest($1, $2)", [
      email,
      password,
    ]);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Guest create failed";
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    await client.end().catch(() => undefined);
  }

  const tokenRes = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  const tokenJson = (await tokenRes.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    user?: { id: string };
    msg?: string;
    error_description?: string;
  };

  if (!tokenRes.ok || !tokenJson.access_token || !tokenJson.refresh_token) {
    return NextResponse.json(
      {
        error:
          tokenJson.msg ||
          tokenJson.error_description ||
          "Token exchange failed",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    access_token: tokenJson.access_token,
    refresh_token: tokenJson.refresh_token,
    expires_in: tokenJson.expires_in,
    user_id: tokenJson.user?.id,
  });
}
