import { distance } from "@turf/turf";
import type { Feature, Point } from "geojson";

/** Stable pseudo-random offset around venue (~25–70 m) for map markers. */
export function displayPositionFromSeed(
  seed: string,
  venueLat: number,
  venueLng: number,
): { lat: number; lng: number } {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const angle = ((hash % 360) * Math.PI) / 180;
  const radiusM = 25 + (Math.abs(hash) % 45);
  const dLat = (radiusM / 111_320) * Math.cos(angle);
  const dLng =
    (radiusM / (111_320 * Math.cos((venueLat * Math.PI) / 180))) *
    Math.sin(angle);
  return { lat: venueLat + dLat, lng: venueLng + dLng };
}

export function metersFromVenue(
  lat: number,
  lng: number,
  venueLat: number,
  venueLng: number,
): number {
  const from: Feature<Point> = {
    type: "Feature",
    properties: {},
    geometry: { type: "Point", coordinates: [venueLng, venueLat] },
  };
  const to: Feature<Point> = {
    type: "Feature",
    properties: {},
    geometry: { type: "Point", coordinates: [lng, lat] },
  };
  return distance(from, to, { units: "meters" });
}

export function isNearVenue(
  lat: number,
  lng: number,
  venueLat: number,
  venueLng: number,
  maxMeters = 500,
): boolean {
  return metersFromVenue(lat, lng, venueLat, venueLng) <= maxMeters;
}
