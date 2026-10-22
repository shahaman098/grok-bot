import type { StyleSpecification } from "maplibre-gl";

/** Venue-level streets without credentials; configured deployments use MapTiler. */
export function getMapStyle(): string | StyleSpecification {
  const key = process.env.NEXT_PUBLIC_MAPTILER_KEY;
  if (key)
    return `https://api.maptiler.com/maps/dataviz-dark/style.json?key=${encodeURIComponent(key)}`;
  return {
    version: 8,
    sources: {
      streets: {
        type: "raster",
        tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
        tileSize: 256,
        maxzoom: 19,
        attribution:
          '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
      },
    },
    layers: [
      {
        id: "streets",
        type: "raster",
        source: "streets",
        paint: { "raster-saturation": -0.4 },
      },
    ],
  };
}
