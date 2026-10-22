import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
const headers = {
  "Cache-Control": "no-store, max-age=0",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow",
};
export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id } = await context.params;
  if (slug.length > 64 || !z.uuid().safeParse(id).success)
    return NextResponse.json({ snapshot: null }, { status: 404, headers });
  try {
    const client = await createClient();
    const { data, error } = await client.rpc("stage_connection", {
      p_event_slug: slug,
      p_id: id,
    });
    if (error)
      return NextResponse.json(
        { error: "Could not check stage permission" },
        { status: 503, headers },
      );
    return NextResponse.json({ snapshot: data ?? null }, { headers });
  } catch {
    return NextResponse.json(
      { error: "Could not check stage permission" },
      { status: 503, headers },
    );
  }
}
