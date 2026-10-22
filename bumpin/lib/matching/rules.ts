import type {
  MatchEvidence,
  PublicAttendee,
  RecommendResult,
} from "@/lib/types";

const STOP_WORDS = new Set([
  "who",
  "what",
  "where",
  "the",
  "and",
  "for",
  "with",
  "are",
  "anyone",
  "someone",
  "building",
  "looking",
  "wants",
  "meet",
  "can",
  "help",
  "need",
  "needs",
  "want",
  "your",
  "you",
  "our",
  "their",
  "some",
  "have",
  "that",
  "this",
  "from",
  "collaborator",
  "collaborators",
]);
const ALIASES: Record<string, string> = {
  designer: "design",
  designers: "design",
  designing: "design",
  designs: "design",
  developer: "development",
  developers: "development",
  coding: "development",
  code: "development",
  programming: "development",
  engineer: "development",
  engineers: "development",
  founders: "founder",
  startups: "startup",
  events: "event",
  agents: "agent",
  games: "game",
  mentors: "mentor",
  mentoring: "mentor",
  speakers: "speaker",
};
export function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length >= 2 && !STOP_WORDS.has(t))
      .map((t) => ALIASES[t] ?? t),
  );
}
function overlap(
  a: string | null | undefined,
  b: string | null | undefined,
): string[] {
  const bTokens = tokenize(b ?? "");
  return [...tokenize(a ?? "")].filter((t) => bTokens.has(t)).sort();
}
function extras(evidence: MatchEvidence[]) {
  const terms = [...new Set(evidence.flatMap((e) => e.terms))].join(", ");
  return {
    conversationStarter: `Our profiles connect around ${terms}. What is one specific problem we could explore together?`,
    suggestedTask: `Spend ten minutes on ${terms}: each describe one need, sketch one small experiment together, and agree who would do the next step.`,
  };
}
export function recommendRules(
  attendees: PublicAttendee[],
  query: string,
): RecommendResult[] {
  return attendees
    .filter((a) => !a.isSelf)
    .flatMap((a) => {
      const theirExcerpt = [a.building, a.canHelpWith, a.lookingFor]
        .filter(Boolean)
        .join(" · ");
      const terms = overlap(query, theirExcerpt);
      if (!terms.length) return [];
      const evidence: MatchEvidence[] = [
        { direction: "search", terms, yourExcerpt: query, theirExcerpt },
      ];
      return [
        {
          membershipId: a.membershipId,
          displayName: a.displayName,
          reason: `Matched profile terms: ${terms.join(", ")}. ${theirExcerpt}`,
          score: terms.length,
          source: "rules" as const,
          category: "search" as const,
          evidence,
          ...extras(evidence),
        },
      ];
    })
    .sort(
      (a, b) =>
        b.score - a.score || a.membershipId.localeCompare(b.membershipId),
    )
    .slice(0, 5);
}
export function recommendForProfile(
  self: PublicAttendee,
  attendees: PublicAttendee[],
): RecommendResult[] {
  if (!self.canHelpWith?.trim() || !self.lookingFor?.trim()) return [];
  return attendees
    .filter((a) => !a.isSelf && a.membershipId !== self.membershipId)
    .flatMap((a) => {
      const evidence: MatchEvidence[] = [];
      const add = (
        direction: MatchEvidence["direction"],
        yours: string | null | undefined,
        theirs: string | null | undefined,
      ) => {
        const terms = overlap(yours, theirs);
        if (terms.length)
          evidence.push({
            direction,
            terms,
            yourExcerpt: yours!,
            theirExcerpt: theirs!,
          });
      };
      add("they-help-you", self.lookingFor, a.canHelpWith);
      add("you-help-them", self.canHelpWith, a.lookingFor);
      const directions = evidence.length;
      if (!directions) add("shared-interest", self.building, a.building);
      if (!evidence.length) return [];
      const category: RecommendResult["category"] =
        directions === 2
          ? "mutual"
          : directions === 1
            ? "one-way"
            : "shared-interest";
      const reason =
        category === "mutual"
          ? "You each offer something the other is looking for."
          : category === "one-way"
            ? "One of you offers help the other is looking for."
            : "Your projects mention a shared interest; complementary skills are not confirmed.";
      // Fractional tie-break never lets term count outrank a stronger category.
      const score =
        (directions === 2 ? 3 : directions === 1 ? 2 : 1) +
        Math.min(evidence.flatMap((e) => e.terms).length, 99) / 100;
      return [
        {
          membershipId: a.membershipId,
          displayName: a.displayName,
          reason,
          score,
          source: "rules" as const,
          category,
          evidence,
          ...extras(evidence),
        },
      ];
    })
    .sort(
      (a, b) =>
        b.score - a.score || a.membershipId.localeCompare(b.membershipId),
    )
    .slice(0, 5);
}
