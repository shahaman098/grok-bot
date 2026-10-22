import type { PublicAttendee } from "@/lib/types";

export function mapAttendeeRow(row: {
  membership_id: string;
  display_name: string;
  linkedin_url: string | null;
  avatar_seed: string;
  building: string | null;
  can_help_with?: string | null;
  looking_for: string | null;
  display_lat: number | null;
  display_lng: number | null;
  is_self: boolean;
}): PublicAttendee | null {
  if (row.display_lat == null || row.display_lng == null) return null;
  if (!row.is_self && row.display_lat === 0 && row.display_lng === 0) return null;
  return {
    membershipId: row.membership_id,
    displayName: row.display_name,
    linkedinUrl: row.linkedin_url,
    avatarSeed: row.avatar_seed,
    building: row.building,
    canHelpWith: row.can_help_with ?? null,
    lookingFor: row.looking_for,
    displayLat: row.display_lat,
    displayLng: row.display_lng,
    isSelf: row.is_self,
  };
}
