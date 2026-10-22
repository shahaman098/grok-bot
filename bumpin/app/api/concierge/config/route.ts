import { NextResponse } from "next/server";
import { conciergeEnabled } from "@/lib/concierge/config";
import { conciergeAccess } from "@/lib/concierge/access";
import { conciergeFailure, eventContext, noStore } from "@/lib/concierge/server";

export async function GET(request: Request) {
  try {
    const slug = new URL(request.url).searchParams.get("eventSlug");
    if (!slug || slug.length > 64)
      return NextResponse.json({ voiceEnabled: false, access: "required" }, { headers: noStore });
    const access = await conciergeAccess(await eventContext(slug));
    return NextResponse.json(
      { voiceEnabled: access === "approved" && conciergeEnabled(), access },
      { headers: noStore },
    );
  } catch (error) {
    return conciergeFailure(error);
  }
}
