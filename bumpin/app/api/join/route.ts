import { linkedInIdentity } from "@/lib/auth/linkedin";
import { NextResponse } from "next/server";
import { resolveDisplayPosition } from "@/lib/display-position";
import { joinBodySchema, normalizeLinkedInUrl } from "@/lib/validation";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = joinBodySchema.parse(await request.json());
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id, venue_lat, venue_lng")
      .eq("slug", body.eventSlug)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const linkedin = normalizeLinkedInUrl(body.linkedinUrl);
    if (body.linkedinUrl?.trim() && !linkedin) {
      return NextResponse.json(
        { error: "Invalid LinkedIn URL" },
        { status: 400 },
      );
    }

    const { lat, lng } = resolveDisplayPosition({
      userId: user.id,
      venueLat: event.venue_lat,
      venueLng: event.venue_lng,
      locationConsent: body.locationConsent,
      clientLat: body.clientLat,
      clientLng: body.clientLng,
    });

    const identity = linkedInIdentity(user);
    const { error: profileError } = await supabase.from("profiles").upsert({
      id: user.id,
      display_name: identity?.displayName ?? body.displayName.trim(),
      avatar_url: identity?.avatarUrl ?? null,
      linkedin_url: linkedin,
      avatar_seed: body.avatarSeed,
      building: body.building?.trim() || null,
      can_help_with: body.canHelpWith?.trim() || null,
      looking_for: body.lookingFor?.trim() || null,
    });

    if (profileError) {
      return NextResponse.json(
        { error: profileError.message },
        { status: 500 },
      );
    }

    const { error: membershipError } = await supabase
      .from("event_memberships")
      .upsert({
        event_id: event.id,
        user_id: user.id,
        visible: body.visible,
        location_consent: body.locationConsent,
        display_lat: body.visible ? lat : null,
        display_lng: body.visible ? lng : null,
        last_seen_at: new Date().toISOString(),
      });

    if (membershipError) {
      return NextResponse.json(
        { error: membershipError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
