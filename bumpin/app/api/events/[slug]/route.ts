import { NextResponse } from "next/server";
import { getSeedEvent } from "@/lib/events/seed";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const seed = getSeedEvent(slug);

  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("events")
      .select(
        "slug, name, venue_name, venue_lat, venue_lng, luma_url, starts_at, ends_at",
      )
      .eq("slug", slug)
      .maybeSingle();

    if (data) {
      return NextResponse.json({
        slug: data.slug,
        name: data.name,
        venueName: data.venue_name,
        venueLat: data.venue_lat,
        venueLng: data.venue_lng,
        lumaUrl: data.luma_url,
        startsAt: data.starts_at,
        endsAt: data.ends_at,
      });
    }
  } catch {
    /* fall through to seed */
  }

  if (!seed) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  return NextResponse.json({
    slug: seed.slug,
    name: seed.name,
    venueName: seed.venueName,
    venueLat: seed.venueLat,
    venueLng: seed.venueLng,
    lumaUrl: seed.lumaUrl,
    startsAt: seed.startsAt,
    endsAt: seed.endsAt,
  });
}
