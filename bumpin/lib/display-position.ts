import { displayPositionFromSeed } from "@/lib/geo";

/** Venue-anchored placement only. Never publish client GPS, even with consent. */
export function resolveDisplayPosition(params: {
  userId: string;
  venueLat: number;
  venueLng: number;
  locationConsent?: boolean;
  clientLat?: number;
  clientLng?: number;
}): { lat: number; lng: number } {
  return displayPositionFromSeed(params.userId, params.venueLat, params.venueLng);
}
