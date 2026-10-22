import { describe, expect, it } from "vitest";
import { joinBodySchema, normalizeLinkedInUrl, recommendBodySchema } from "@/lib/validation";

describe("normalizeLinkedInUrl", () => {
  it("accepts https linkedin profile", () => {
    expect(
      normalizeLinkedInUrl("https://www.linkedin.com/in/example"),
    ).toBe("https://www.linkedin.com/in/example");
  });

  it("rejects javascript scheme", () => {
    expect(normalizeLinkedInUrl("javascript:alert(1)")).toBeNull();
  });

  it("returns null for empty", () => {
    expect(normalizeLinkedInUrl("")).toBeNull();
  });
});


describe("input validation", () => {
  const input = { eventSlug: "event", displayName: "  ", avatarSeed: "avatar", visible: false, locationConsent: false };
  it("rejects whitespace-only display names", () => {
    expect(joinBodySchema.safeParse(input).success).toBe(false);
  });
  it("trims valid display names", () => {
    expect(joinBodySchema.parse({ ...input, displayName: " Ada " }).displayName).toBe("Ada");
  });
  it("rejects blank recommendation questions", () => {
    expect(recommendBodySchema.safeParse({ eventSlug: "event", query: "   " }).success).toBe(false);
  });
});
