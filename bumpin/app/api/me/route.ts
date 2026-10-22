import { linkedInIdentity } from "@/lib/auth/linkedin";
import { NextResponse } from "next/server";
import { resolveDisplayPosition } from "@/lib/display-position";
import { patchMeSchema } from "@/lib/validation";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: Request) {
  try {
    const body = patchMeSchema.parse(await request.json());
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: event } = await supabase
      .from("events")
      .select("id, venue_lat, venue_lng")
      .eq("slug", body.eventSlug)
      .single();

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const { data: existing } = await supabase
      .from("event_memberships")
      .select("visible, location_consent")
      .eq("event_id", event.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: "Not joined" }, { status: 404 });
    }

    const visible = body.visible ?? existing.visible;
    const locationConsent = body.locationConsent ?? existing.location_consent;

    const profilePatch: Record<string, string | null> = {};
    if (body.canHelpWith !== undefined)
      profilePatch.can_help_with = body.canHelpWith.trim() || null;
    if (body.building !== undefined) {
      profilePatch.building = body.building.trim() || null;
    }
    if (body.lookingFor !== undefined) {
      profilePatch.looking_for = body.lookingFor.trim() || null;
    }

    if (Object.keys(profilePatch).length > 0) {
      const { error } = await supabase
        .from("profiles")
        .update(profilePatch)
        .eq("id", user.id);
      if (error)
        return NextResponse.json(
          { error: "Could not update profile" },
          { status: 500 },
        );
    }

    let displayLat: number | null = null;
    let displayLng: number | null = null;

    if (visible) {
      const pos = resolveDisplayPosition({
        userId: user.id,
        venueLat: event.venue_lat,
        venueLng: event.venue_lng,
        locationConsent,
        clientLat: body.clientLat,
        clientLng: body.clientLng,
      });
      displayLat = pos.lat;
      displayLng = pos.lng;
    }

    const { error } = await supabase
      .from("event_memberships")
      .update({
        visible,
        location_consent: locationConsent,
        display_lat: displayLat,
        display_lng: displayLng,
        last_seen_at: new Date().toISOString(),
      })
      .eq("event_id", event.id)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function GET(request: Request) {
  const eventSlug = new URL(request.url).searchParams.get("eventSlug");
  if (!eventSlug || eventSlug.length > 64) {
    return NextResponse.json(
      { error: "Event slug is required" },
      { status: 400 },
    );
  }
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id")
      .eq("slug", eventSlug)
      .maybeSingle();
    if (eventError) throw eventError;
    if (!event)
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    const { data: membership, error } = await supabase
      .from("event_memberships")
      .select("visible")
      .eq("event_id", event.id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) throw error;
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select(
        "display_name, avatar_seed, avatar_url, linkedin_url, building, can_help_with, looking_for",
      )
      .eq("id", user.id)
      .maybeSingle();
    if (profileError) throw profileError;
    return NextResponse.json(
      {
        membership,
        identity: linkedInIdentity(user),
        profile: profile
          ? {
              displayName: profile.display_name,
              avatarSeed: profile.avatar_seed,
              avatarUrl: profile.avatar_url,
              linkedinUrl: profile.linkedin_url,
              building: profile.building,
              canHelpWith: profile.can_help_with,
              lookingFor: profile.looking_for,
            }
          : null,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "Could not restore event membership" },
      { status: 503 },
    );
  }
}
