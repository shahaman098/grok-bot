import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSeedEvent, GROK_BOT_LONDON } from "@/lib/events/seed";
import { completeLinkedInEntry } from "@/lib/auth/linkedin-entry";
import {
  hasJoinIntent,
  JOIN_INTENT_COOKIE,
  joinIntentCookieOptions,
  requestOrigin,
} from "@/lib/auth/linkedin-intent";
export async function GET(request: Request) {
  const url = new URL(request.url);
  const requested = url.searchParams.get("eventSlug") ?? "";
  const slug = getSeedEvent(requested)?.slug ?? GROK_BOT_LONDON.slug;
  const origin = requestOrigin(request);
  const destination = new URL(`/e/${slug}`, origin);
  const redirect = () => {
    const response = NextResponse.redirect(destination, {
      headers: {
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
      },
    });
    response.cookies.set(JOIN_INTENT_COOKIE, "", {
      ...joinIntentCookieOptions,
      maxAge: 0,
      secure: origin.startsWith("https:"),
    });
    return response;
  };
  const code = url.searchParams.get("code");
  const declined = url.searchParams.get("error") === "access_denied";
  if (code && code.length <= 4096 && !url.searchParams.has("error")) {
    try {
      const client = await createClient();
      const { error } = await client.auth.exchangeCodeForSession(code);
      if (!error) {
        if (url.searchParams.has("joinIntent")) {
          if (!hasJoinIntent(request, slug))
            destination.searchParams.set("signin", "join-failed");
          else {
            try {
              await completeLinkedInEntry(client, slug);
            } catch {
              destination.searchParams.set("signin", "join-failed");
            }
          }
        }
        return redirect();
      }
    } catch {
      /* Return a fixed, non-sensitive status. */
    }
  }
  destination.searchParams.set("signin", declined ? "cancelled" : "failed");
  return redirect();
}
