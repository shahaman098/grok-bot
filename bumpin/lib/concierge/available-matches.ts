import type { PublicAttendee, RecommendResult } from "@/lib/types";

/** Re-check the directory after polling: a quoted need must never become an offer. */
export function availableMatches(
  matches: RecommendResult[],
  attendees: PublicAttendee[],
) {
  return matches.filter((match) => {
    const person = attendees.find(
      (a) => !a.isSelf && a.membershipId === match.membershipId,
    );
    return (
      person &&
      match.evidence.every((evidence) =>
        evidence.profileField
          ? person[evidence.profileField]?.includes(evidence.theirExcerpt)
          : [person.building, person.canHelpWith, person.lookingFor]
              .filter(Boolean)
              .join(" · ")
              .includes(evidence.theirExcerpt),
      )
    );
  });
}
