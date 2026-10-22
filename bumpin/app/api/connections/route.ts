import { NextResponse } from "next/server";
import { authenticatedClient, privateHeaders, rpcFailure } from "@/lib/connections/api";
import { connectionCreateSchema } from "@/lib/validation";
import { mapAttendeeRow } from "@/lib/api/map-attendee";
import { recommendForProfile } from "@/lib/matching/rules";
import type { PublicAttendee } from "@/lib/types";
export async function GET(request: Request) {
  try {
    const slug = new URL(request.url).searchParams.get("eventSlug");
    if (!slug || slug.length > 64) return NextResponse.json({ error: "Event required" }, { status: 400 });
    const client = await authenticatedClient();
    if (!client) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { data, error } = await client.rpc("list_connections", { p_event_slug: slug });
    if (error) return rpcFailure(error);
    return NextResponse.json({ connections: data ?? [] }, { headers: privateHeaders });
  } catch { return NextResponse.json({ error: "Could not load introductions" }, { status: 503 }); }
}
export async function POST(request: Request) {
  const parsed = connectionCreateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid introduction request" }, { status: 400 });
  try {
    const client = await authenticatedClient();
    if (!client) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { eventSlug, targetMembershipId } = parsed.data;
    const { data, error } = await client.rpc("list_event_attendees", { p_event_slug: eventSlug });
    if (error) return rpcFailure(error);
    const attendees = ((data ?? []) as Parameters<typeof mapAttendeeRow>[0][]).map(mapAttendeeRow).filter((a): a is PublicAttendee => a !== null);
    const self = attendees.find((a) => a.isSelf);
    if (!self) return NextResponse.json({ error: "Become visible to request an introduction" }, { status: 403 });
    // Recalculate on the server. A client cannot submit someone else's evidence or score.
    const match = recommendForProfile(self, attendees).find((a) => a.membershipId === targetMembershipId);
    if (!match) return NextResponse.json({ error: "This match is no longer available. Refresh recommendations." }, { status: 409 });
    const { data: connection, error: writeError } = await client.rpc("create_connection", { p_event_slug: eventSlug, p_target: targetMembershipId, p_content: { category: match.category, evidence: match.evidence, conversationStarter: match.conversationStarter, suggestedTask: match.suggestedTask } });
    if (writeError) return rpcFailure(writeError);
    return NextResponse.json({ connection }, { headers: privateHeaders });
  } catch { return NextResponse.json({ error: "Could not request introduction" }, { status: 503 }); }
}
