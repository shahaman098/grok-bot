import { afterEach, describe, expect, it, vi } from "vitest";
import { getMapStyle } from "@/lib/map/style";

afterEach(() => vi.unstubAllEnvs());
describe("event map styles", () => {
  it("provides attributed street tiles at venue zoom without a key", () => {
    vi.stubEnv("NEXT_PUBLIC_MAPTILER_KEY", "");
    const style = getMapStyle();
    expect(typeof style).toBe("object");
    if (typeof style === "string") throw new Error("Expected local style");
    expect(style.sources.streets).toMatchObject({
      type: "raster",
      maxzoom: 19,
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
    });
    expect(JSON.stringify(style.sources.streets)).toContain("OpenStreetMap");
  });
  it("keeps configured MapTiler support and encodes its key", () => {
    vi.stubEnv("NEXT_PUBLIC_MAPTILER_KEY", "test&key");
    expect(getMapStyle()).toBe(
      "https://api.maptiler.com/maps/dataviz-dark/style.json?key=test%26key",
    );
  });
});
