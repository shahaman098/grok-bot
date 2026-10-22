import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { mutationGuard } from "@/lib/connections/api";
import { getSeedEvent } from "@/lib/events/seed";
import {
  createJoinIntent,
  JOIN_INTENT_COOKIE,
  JOIN_INTENT_SECONDS,
  joinIntentCookieOptions,
  requestOrigin,
} from "@/lib/auth/linkedin-intent";
const headers = { "Cache-Control": "no-store" };
async function providerEnabled() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return false;
  const res = await fetch(`${url}/auth/v1/settings`, {
    headers: { apikey: key },
    cache: "no-store",
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error("Provider settings unavailable");
  return (await res.json()).external?.linkedin_oidc === true;
}
export async function GET() {
  try {
    return NextResponse.json({ enabled: await providerEnabled() }, { headers });
  } catch {
    return NextResponse.json({ enabled: false }, { status: 503, headers });
  }
}

const startSchema = z.object({
  eventSlug: z.string().max(64),
  shareProfile: z.literal(true),
});
export async function POST(request: Request) {
  const blocked = mutationGuard(request);
  if (blocked) return blocked;
  let body;
  try {
    body = startSchema.parse(await request.json());
    if (!getSeedEvent(body.eventSlug)) throw new Error("Unknown event");
  } catch {
    return NextResponse.json(
      { error: "Choose a valid event and agree to share your profile." },
      { status: 400, headers },
    );
  }
  try {
    if (!(await providerEnabled()))
      return NextResponse.json(
        { error: "LinkedIn is not available yet. Please join as a guest." },
        { status: 503, headers },
      );
    const origin = requestOrigin(request);
    const intent = createJoinIntent(body.eventSlug);
    const redirectTo = new URL("/auth/callback", origin);
    redirectTo.searchParams.set("eventSlug", body.eventSlug);
    redirectTo.searchParams.set("joinIntent", intent.nonce);
    const client = await createClient();
    const { data, error } = await client.auth.signInWithOAuth({
      provider: "linkedin_oidc",
      options: {
        redirectTo: redirectTo.href,
        scopes: "openid profile email",
        skipBrowserRedirect: true,
      },
    });
    if (error || !data.url) throw new Error("Could not start sign-in");
    const response = NextResponse.json({ url: data.url }, { headers });
    response.cookies.set(JOIN_INTENT_COOKIE, intent.value, {
      ...joinIntentCookieOptions,
      secure: origin.startsWith("https:"),
      maxAge: JOIN_INTENT_SECONDS,
    });
    return response;
  } catch {
    return NextResponse.json(
      {
        error: "LinkedIn could not start. Please try again or join as a guest.",
      },
      { status: 503, headers },
    );
  }
}
