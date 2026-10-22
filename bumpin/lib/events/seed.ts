export type SeedEvent = {
  slug: string;
  name: string;
  venueName: string;
  venueLat: number;
  venueLng: number;
  lumaUrl: string;
  startsAt: string;
  endsAt: string;
};

export const GROK_BOT_LONDON: SeedEvent = {
  slug: "grok-bot-london",
  name: "Grok Bot Community Engineering London Hackathon",
  venueName: "Expedite London HQ — 7 Lyric Square, London W6 0DA, UK",
  venueLat: 51.49329,
  venueLng: -0.22571,
  lumaUrl: "https://luma.com/eveur09a",
  startsAt: "2026-10-22T17:00:00.000Z",
  endsAt: "2026-10-22T22:00:00.000Z",
};

export function getSeedEvent(slug: string): SeedEvent | null {
  if (slug === GROK_BOT_LONDON.slug) return GROK_BOT_LONDON;
  return null;
}
