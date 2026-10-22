import type { PublicAttendee, RecommendResult } from "@/lib/types";
import { recommendRules } from "@/lib/matching/rules";

/** External AI is intentionally disabled until API, consent and responses are verified. */
export async function recommend(attendees: PublicAttendee[], query: string): Promise<RecommendResult[]> {
  return recommendRules(attendees, query);
}
