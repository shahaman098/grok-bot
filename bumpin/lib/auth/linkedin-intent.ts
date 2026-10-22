import { randomUUID } from "node:crypto";
import { getSeedEvent } from "@/lib/events/seed";

export const JOIN_INTENT_COOKIE = "bumpin-linkedin-join";
export const JOIN_INTENT_SECONDS = 600;
export const joinIntentCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/auth/callback",
};

export function createJoinIntent(eventSlug: string) {
  const intent = { eventSlug, nonce: randomUUID(), issuedAt: Date.now() };
  return {
    nonce: intent.nonce,
    value: Buffer.from(JSON.stringify(intent)).toString("base64url"),
  };
}

export function hasJoinIntent(request: Request, eventSlug: string): boolean {
  const nonce = new URL(request.url).searchParams.get("joinIntent");
  if (!nonce || !getSeedEvent(eventSlug)) return false;
  const cookie = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${JOIN_INTENT_COOKIE}=`))
    ?.slice(JOIN_INTENT_COOKIE.length + 1);
  if (!cookie || cookie.length > 1024) return false;
  try {
    const value = JSON.parse(Buffer.from(cookie, "base64url").toString("utf8"));
    const age = Date.now() - value.issuedAt;
    return (
      value.nonce === nonce &&
      value.eventSlug === eventSlug &&
      typeof value.issuedAt === "number" &&
      age >= 0 &&
      age <= JOIN_INTENT_SECONDS * 1000
    );
  } catch {
    return false;
  }
}

export function requestOrigin(request: Request): string {
  const url = new URL(request.url);
  const host = request.headers.get("host") ?? url.host;
  const protocol =
    request.headers.get("x-forwarded-proto")?.split(",")[0].trim() ??
    url.protocol.slice(0, -1);
  return new URL(`${protocol}://${host}`).origin;
}
