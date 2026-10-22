import { NextResponse } from "next/server";
import { z } from "zod";
import { mutationGuard } from "@/lib/connections/api";
import { conciergeAccess } from "@/lib/concierge/access";
import { conciergeFailure, eventContext, noStore } from "@/lib/concierge/server";

export async function POST(request: Request) {
  const rejected = mutationGuard(request);
  if (rejected) return rejected;
  try {
    const body = z.object({ eventSlug: z.string().trim().min(1).max(64) })
      .strict().safeParse(await request.json());
    if (!body.success)
      return NextResponse.json({ error: "Invalid access request." }, { status: 400, headers: noStore });
    const access = await conciergeAccess(await eventContext(body.data.eventSlug), true);
    return NextResponse.json({ access }, { headers: noStore });
  } catch (error) {
    return conciergeFailure(error);
  }
}
