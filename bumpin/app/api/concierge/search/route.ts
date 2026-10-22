import { NextResponse } from "next/server";
import { z } from "zod";
import { mutationGuard } from "@/lib/connections/api";
import { conciergeEnabled } from "@/lib/concierge/config";
import { requireConciergeAccess } from "@/lib/concierge/access";
import { semanticMatches } from "@/lib/concierge/matching";
import {
  claimQuota,
  ConciergeError,
  conciergeFailure,
  eventContext,
  noStore,
  publicAttendees,
} from "@/lib/concierge/server";
import { recommendRules } from "@/lib/matching/rules";

const input = z
  .object({
    eventSlug: z.string().trim().min(1).max(64),
    query: z.string().trim().min(1).max(300),
  })
  .strict();

export async function POST(request: Request) {
  const rejected = mutationGuard(request);
  if (rejected) return rejected;
  try {
    const body = input.safeParse(await request.json());
    if (!body.success)
      return NextResponse.json(
        { error: "Enter a request of up to 300 characters." },
        { status: 400, headers: noStore },
      );
    const context = await eventContext(body.data.eventSlug);
    const attendees = await publicAttendees(context);
    let fallbackReason =
      "AI isn’t connected yet. Showing basic profile-term matches.";
    if (conciergeEnabled()) {
      try {
        await requireConciergeAccess(context);
        await claimQuota(context, "search");
        const results = await semanticMatches(attendees, body.data.query);
        // Visibility or profile evidence may change while the provider is running.
        const current = await publicAttendees(
          await eventContext(body.data.eventSlug),
        );
        const matches = results.filter((m) => {
          const person = current.find((a) => a.membershipId === m.membershipId);
          return (
            person &&
            m.evidence.every((e) =>
              e.profileField
                ? person[e.profileField]?.includes(e.theirExcerpt)
                : [person.canHelpWith, person.building, person.lookingFor].some(
                    (field) => field?.includes(e.theirExcerpt),
                  ),
            )
          );
        });
        return NextResponse.json(
          { matches, source: "grok" },
          { headers: noStore },
        );
      } catch (error) {
        fallbackReason =
          error instanceof ConciergeError && error.status === 403
            ? "Request access for AI matching. Showing free basic profile-term matches."
            : "AI matching is unavailable for now. Showing basic profile-term matches.";
      }
    }
    const current = await publicAttendees(
      await eventContext(body.data.eventSlug),
    );
    const matches = recommendRules(current, body.data.query).slice(0, 3);
    return NextResponse.json(
      { matches, source: "rules", fallbackReason },
      { headers: noStore },
    );
  } catch (error) {
    return conciergeFailure(error);
  }
}
