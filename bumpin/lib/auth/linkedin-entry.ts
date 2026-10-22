import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { linkedInIdentity } from "@/lib/auth/linkedin";
import { resolveDisplayPosition } from "@/lib/display-position";

/** Called only after PKCE exchange and a matching, explicit event-sharing intent. */
export async function completeLinkedInEntry(
  client: SupabaseClient,
  eventSlug: string,
) {
  const {
    data: { user },
    error: authError,
  } = await client.auth.getUser();
  const identity = user && linkedInIdentity(user);
  if (authError || !user || !identity)
    throw new Error("LinkedIn sign-in required");
  const { data: event, error: eventError } = await client
    .from("events")
    .select("id, venue_lat, venue_lng")
    .eq("slug", eventSlug)
    .single();
  if (eventError || !event) throw new Error("Event unavailable");
  const { data: saved, error: savedError } = await client
    .from("profiles")
    .select("avatar_seed")
    .eq("id", user.id)
    .maybeSingle();
  if (savedError) throw new Error("Profile unavailable");
  // Update imported identity only; preserve saved goals, offers, projects and links.
  const { error: profileError } = await client.from("profiles").upsert({
    id: user.id,
    display_name: identity.displayName,
    avatar_url: identity.avatarUrl,
    avatar_seed: saved?.avatar_seed ?? randomUUID().slice(0, 8),
  });
  if (profileError) throw new Error("Could not save profile");
  const { lat, lng } = resolveDisplayPosition({
    userId: user.id,
    venueLat: event.venue_lat,
    venueLng: event.venue_lng,
    locationConsent: false,
  });
  // A repeated callback must not overwrite an existing member's visibility.
  const { error: membershipError } = await client
    .from("event_memberships")
    .upsert(
      {
        event_id: event.id,
        user_id: user.id,
        visible: true,
        location_consent: false,
        display_lat: lat,
        display_lng: lng,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "event_id,user_id", ignoreDuplicates: true },
    );
  if (membershipError) throw new Error("Could not enter event");
}
