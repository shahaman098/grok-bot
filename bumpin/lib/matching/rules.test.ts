import { describe, expect, it } from "vitest";
import { recommendRules } from "@/lib/matching/rules";
import type { PublicAttendee } from "@/lib/types";

const attendees: PublicAttendee[] = [
  {
    membershipId: "1",
    displayName: "Ada",
    linkedinUrl: null,
    avatarSeed: "ada",
    building: "AI agents for events",
    lookingFor: "collab on event stack",
    displayLat: 51.49,
    displayLng: -0.22,
  },
  {
    membershipId: "2",
    displayName: "Bob",
    linkedinUrl: null,
    avatarSeed: "bob",
    building: "mobile games",
    lookingFor: "designers",
    displayLat: 51.49,
    displayLng: -0.22,
  },
];

describe("recommendRules", () => {
  it("ranks keyword overlap first", () => {
    const results = recommendRules(attendees, "Who is building AI agents?");
    expect(results[0]?.displayName).toBe("Ada");
    expect(results[0]?.source).toBe("rules");
    expect(results[0]?.reason.toLowerCase()).toContain("matched");
  });

  it("does not claim unrelated profiles are matches", () => {
    expect(recommendRules(attendees, "quantum cryptography")).toEqual([]);
  });

  it("matches short skills such as AI", () => {
    expect(recommendRules(attendees, "AI").map((m) => m.displayName)).toEqual(["Ada"]);
  });

  it("excludes your own profile", () => {
    expect(recommendRules(attendees.map((a) => ({ ...a, isSelf: true })), "agents")).toEqual([]);
  });

  it("is deterministic for same inputs", () => {
    const a = recommendRules(attendees, "event tooling");
    const b = recommendRules(attendees, "event tooling");
    expect(a).toEqual(b);
  });
});
