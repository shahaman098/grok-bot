import { NextResponse } from "next/server";
import { mapAttendeeRow } from "@/lib/api/map-attendee";
import { createClient } from "@/lib/supabase/server";
import type { PublicAttendee } from "@/lib/types";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase.rpc("list_event_attendees", {
      p_event_slug: slug,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = (data ?? []) as Parameters<typeof mapAttendeeRow>[0][];
    const attendees = rows
      .map(mapAttendeeRow)
      .filter((a): a is PublicAttendee => a !== null);

    return NextResponse.json({ attendees });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
