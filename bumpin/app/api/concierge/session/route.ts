import { NextResponse } from "next/server";
import { z } from "zod";
import { mutationGuard } from "@/lib/connections/api";
import { requireConciergeAccess } from "@/lib/concierge/access";
import {
  conciergeEnabled,
  VOICE_MODEL,
  voiceSessionConfig,
} from "@/lib/concierge/config";
import {
  claimQuota,
  conciergeFailure,
  ConciergeError,
  eventContext,
  noStore,
} from "@/lib/concierge/server";

export async function POST(request: Request) {
  const rejected = mutationGuard(request);
  if (rejected) return rejected;
  try {
    const parsed = z
      .object({ eventSlug: z.string().trim().min(1).max(64) })
      .strict()
      .safeParse(await request.json());
    if (!parsed.success)
      return NextResponse.json(
        { error: "Invalid event." },
        { status: 400, headers: noStore },
      );
    const context = await eventContext(parsed.data.eventSlug);
    await requireConciergeAccess(context);
    if (!conciergeEnabled())
      throw new ConciergeError(
        "Voice isn’t connected yet. You can still type your request.",
        503,
      );
    await claimQuota(context, "voice");
    const response = await fetch(
      "https://api.x.ai/v1/realtime/client_secrets",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.XAI_API_KEY}`,
        },
        body: JSON.stringify({ expires_after: { seconds: 60 } }),
        signal: AbortSignal.timeout(10_000),
      },
    );
    if (!response.ok)
      throw new ConciergeError(
        "Could not connect voice. Please type or retry.",
        503,
      );
    const token = z
      .object({ value: z.string().min(1), expires_at: z.number() })
      .parse(await response.json());
    return NextResponse.json(
      {
        token: token.value,
        expiresAt: token.expires_at,
        model: process.env.XAI_VOICE_MODEL || VOICE_MODEL,
        session: voiceSessionConfig(),
      },
      { headers: noStore },
    );
  } catch (error) {
    return conciergeFailure(error);
  }
}
