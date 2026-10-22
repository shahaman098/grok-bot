import { describe, expect, it } from "vitest";
import { resolveDisplayPosition } from "@/lib/display-position";
import { metersFromVenue } from "@/lib/geo";

describe("venue-only display positions", () => {
  const venue = { userId: "alice", venueLat: 51.49329, venueLng: -0.22571 };
  it("never returns near-venue precise GPS even with consent", () => {
    const gps = { clientLat: 51.493291234, clientLng: -0.225711234 };
    const position = resolveDisplayPosition({ ...venue, ...gps, locationConsent: true });
    expect(position).toEqual(resolveDisplayPosition({ ...venue, locationConsent: false }));
    expect(position.lat).not.toBe(gps.clientLat);
    expect(position.lng).not.toBe(gps.clientLng);
    expect(metersFromVenue(position.lat, position.lng, venue.venueLat, venue.venueLng)).toBeLessThan(75);
  });
  it("ignores remote coordinates", () => {
    expect(resolveDisplayPosition({ ...venue, clientLat: -30, clientLng: 150, locationConsent: true })).toEqual(resolveDisplayPosition(venue));
  });
});
