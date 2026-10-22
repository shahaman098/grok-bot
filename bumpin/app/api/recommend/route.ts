import { NextResponse } from "next/server";
import { mapAttendeeRow } from "@/lib/api/map-attendee";
import { recommendRules, recommendForProfile } from "@/lib/matching/rules";
import { recommendBodySchema } from "@/lib/validation";
import { createClient } from "@/lib/supabase/server";
import type { PublicAttendee } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = recommendBodySchema.parse(await request.json());
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase.rpc("list_event_attendees", {
      p_event_slug: body.eventSlug,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = (data ?? []) as Parameters<typeof mapAttendeeRow>[0][];
    const attendees = rows
      .map(mapAttendeeRow)
      .filter((a): a is PublicAttendee => a !== null);

    const self = attendees.find((a) => a.isSelf);
    if (!body.query && !self) return NextResponse.json({ error: "Become visible to find a collaborator." }, { status: 403 });
    const matches = body.query ? recommendRules(attendees, body.query) : recommendForProfile(self!, attendees);

    const source =
      matches.length > 0 && matches[0].source === "grok" ? "grok" : "rules";

    return NextResponse.json({ matches, source });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
