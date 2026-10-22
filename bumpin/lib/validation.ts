import { z } from "zod";

const linkedInHost = /^https:\/\/(www\.)?linkedin\.com\//i;

export function normalizeLinkedInUrl(
  raw: string | undefined | null,
): string | null {
  if (!raw?.trim()) return null;
  let url = raw.trim();
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return null;
    if (!linkedInHost.test(parsed.href)) return null;
    return parsed.href.split("?")[0];
  } catch {
    return null;
  }
}

export const joinBodySchema = z.object({
  eventSlug: z.string().trim().min(1).max(64),
  displayName: z.string().trim().min(1).max(80),
  linkedinUrl: z.string().max(2048).optional(),
  avatarSeed: z.string().trim().min(1).max(64),
  building: z.string().max(200).optional(),
  lookingFor: z.string().max(200).optional(),
  canHelpWith: z.string().max(200).optional(),
  visible: z.boolean().default(true),
  locationConsent: z.boolean(),
  clientLat: z.number().min(-90).max(90).optional(),
  clientLng: z.number().min(-180).max(180).optional(),
});

export const patchMeSchema = z.object({
  eventSlug: z.string().trim().min(1).max(64),
  visible: z.boolean().optional(),
  building: z.string().max(200).optional(),
  lookingFor: z.string().max(200).optional(),
  canHelpWith: z.string().max(200).optional(),
  locationConsent: z.boolean().optional(),
  clientLat: z.number().min(-90).max(90).optional(),
  clientLng: z.number().min(-180).max(180).optional(),
});

export const recommendBodySchema = z.object({
  eventSlug: z.string().trim().min(1).max(64),
  query: z.string().trim().min(1).max(300).optional(),
});

export const connectionCreateSchema = z.object({
  eventSlug: z.string().trim().min(1).max(64),
  targetMembershipId: z.string().min(1).max(80),
});
export const connectionActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.enum(["accept", "decline", "withdraw", "revokeStage"]),
  }),
  z.object({
    action: z.literal("chooseJoke"),
    jokeId: z.enum(["tabs", "final", "coffee"]).nullable(),
  }),
  z.object({
    action: z.literal("approveStage"),
    expectedRevision: z.number().int().positive(),
  }),
]);
