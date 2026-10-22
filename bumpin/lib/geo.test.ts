import { describe, expect, it } from "vitest";
import { displayPositionFromSeed, isNearVenue } from "@/lib/geo";

describe("displayPositionFromSeed", () => {
  it("is stable for the same seed", () => {
    const a = displayPositionFromSeed("abc", 51.49329, -0.22571);
    const b = displayPositionFromSeed("abc", 51.49329, -0.22571);
    expect(a).toEqual(b);
  });

  it("differs for different seeds", () => {
    const a = displayPositionFromSeed("abc", 51.49329, -0.22571);
    const b = displayPositionFromSeed("xyz", 51.49329, -0.22571);
    expect(a).not.toEqual(b);
  });
});

describe("isNearVenue", () => {
  it("accepts points near Lyric Square", () => {
    expect(isNearVenue(51.4933, -0.2257, 51.49329, -0.22571, 500)).toBe(true);
  });

  it("rejects far points", () => {
    expect(isNearVenue(51.5, -0.1, 51.49329, -0.22571, 500)).toBe(false);
  });
});
