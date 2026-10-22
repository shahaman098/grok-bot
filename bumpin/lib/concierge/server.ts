import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { mapAttendeeRow } from "@/lib/api/map-attendee";
import type { PublicAttendee } from "@/lib/types";

export class ConciergeError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export const noStore = { "Cache-Control": "no-store" };

export async function eventContext(eventSlug: string) {
  const client = await createClient();
  const {
    data: { user },
    error: authError,
  } = await client.auth.getUser();
  if (!user || authError)
    throw new ConciergeError("Join this event to use the concierge.", 401);
  const { data: event, error: eventError } = await client
    .from("events")
    .select("id")
    .eq("slug", eventSlug)
    .single();
  if (!event || eventError) throw new ConciergeError("Event not found.", 404);
  const { data: membership, error: memberError } = await client
    .from("event_memberships")
    .select("visible")
    .eq("event_id", event.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (memberError)
    throw new ConciergeError(
      "Could not check event membership. Please retry.",
      503,
    );
  if (!membership?.visible)
    throw new ConciergeError(
      "Become visible at this event to use the concierge.",
      403,
    );
  return { client, eventSlug };
}

export async function publicAttendees(
  context: Awaited<ReturnType<typeof eventContext>>,
  options: { includeSelf?: boolean } = {},
) {
  const { data, error } = await context.client.rpc("list_event_attendees", {
    p_event_slug: context.eventSlug,
  });
  if (error)
    throw new ConciergeError("Could not load attendees. Please retry.", 503);
  return ((data ?? []) as Parameters<typeof mapAttendeeRow>[0][])
    .map(mapAttendeeRow)
    .filter(
      (a): a is PublicAttendee => !!a && (options.includeSelf === true || !a.isSelf),
    );
}

export async function claimQuota(
  context: Awaited<ReturnType<typeof eventContext>>,
  kind: "voice" | "search",
) {
  const { data, error } = await context.client.rpc("claim_concierge_quota", {
    p_event_slug: context.eventSlug,
    p_kind: kind,
  });
  if (error)
    throw new ConciergeError(
      "AI setup is incomplete. Basic matching is still available.",
      503,
    );
  if (data !== true)
    throw new ConciergeError(
      "You’ve reached the concierge limit for now. Try again in a minute.",
      429,
    );
}

export function conciergeFailure(error: unknown) {
  if (error instanceof SyntaxError)
    return NextResponse.json(
      { error: "Invalid JSON request." },
      { status: 400, headers: noStore },
    );
  if (error instanceof ConciergeError)
    return NextResponse.json(
      { error: error.message },
      { status: error.status, headers: noStore },
    );
  return NextResponse.json(
    { error: "Concierge unavailable. Please retry or use basic matching." },
    { status: 503, headers: noStore },
  );
}
