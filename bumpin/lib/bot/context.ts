import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { PublicAttendee } from "@/lib/types";

const person = z.object({
  membershipId: z.string(), displayName: z.string(), building: z.string().nullable(),
  canHelpWith: z.string().nullable(), lookingFor: z.string().nullable(), isSelf: z.boolean(),
});
const contextSchema = z.object({ eventSlug: z.string(), attendees: z.array(person) });

// An anonymous client, deliberately independent of browser cookies and admin keys.
export function botDatabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("BumpIn database is unavailable.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function botContext(authorization: string | null) {
  const token = /^Bearer ([a-f0-9]{64})$/i.exec(authorization ?? "")?.[1];
  if (!token) throw new Error("Connect your event account at /connect/grok to search attendees.");
  const { data, error } = await botDatabase().rpc("read_bot_context", { p_token: token });
  if (error) throw new Error("BumpIn connection expired or revoked. Reconnect at /connect/grok.");
  return contextSchema.parse(data);
}

export function matchingAttendees(context: z.infer<typeof contextSchema>): PublicAttendee[] {
  return context.attendees.map((p) => ({ ...p, linkedinUrl: null, avatarSeed: "", displayLat: 0, displayLng: 0 }));
}
