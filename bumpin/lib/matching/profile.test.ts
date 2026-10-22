import { describe, expect, it } from "vitest";
import { recommendForProfile } from "@/lib/matching/rules";
import type { PublicAttendee } from "@/lib/types";
const person = (
  id: string,
  offers: string,
  needs: string,
  building = "AI events",
): PublicAttendee => ({
  membershipId: id,
  displayName: id,
  linkedinUrl: null,
  avatarSeed: id,
  canHelpWith: offers,
  lookingFor: needs,
  building,
  displayLat: 1,
  displayLng: 1,
});
const self = person("me", "React development", "Designers");
describe("profile matchmaking", () => {
  it("orders mutual, one-way and shared interests using explicit evidence", () => {
    const matches = recommendForProfile(self, [
      person("shared", "Sales", "Investors"),
      person("one", "UX design", "Mentors"),
      person("mutual", "Product design", "Developers"),
    ]);
    expect(matches.map((m) => m.category)).toEqual([
      "mutual",
      "one-way",
      "shared-interest",
    ]);
    expect(matches[0].evidence.map((e) => e.direction)).toEqual([
      "they-help-you",
      "you-help-them",
    ]);
    expect(matches[0].evidence[0]).toMatchObject({
      yourExcerpt: "Designers",
      theirExcerpt: "Product design",
      terms: ["design"],
    });
    expect(matches[0].suggestedTask).toContain("ten minutes");
    expect(matches[0].source).toBe("rules");
  });
  it("excludes self, unrelated people and incomplete source profiles", () => {
    expect(
      recommendForProfile(self, [
        self,
        person("other", "Cooking", "Music", "Jazz"),
      ]),
    ).toEqual([]);
    expect(
      recommendForProfile({ ...self, canHelpWith: null }, [
        person("other", "design", "development"),
      ]),
    ).toEqual([]);
  });
  it("does not infer skills from a project description", () => {
    const match = recommendForProfile(self, [
      person("other", "", "", "AI events"),
    ])[0];
    expect(match.category).toBe("shared-interest");
    expect(match.evidence.every((e) => e.direction === "shared-interest")).toBe(
      true,
    );
  });
  it("uses stable identity ordering for ties", () => {
    const a = person("a", "Design", "Development"),
      b = person("b", "Design", "Development");
    expect(
      recommendForProfile(self, [b, a]).map((m) => m.membershipId),
    ).toEqual(["a", "b"]);
  });
});
