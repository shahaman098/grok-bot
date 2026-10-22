import type { MatchEvidence, StageSnapshot } from "@/lib/types";
import { Avatar } from "@/components/ui/avatar";
export const CATEGORY_LABELS = {
  mutual: "You can help each other",
  "one-way": "A complementary connection",
  "shared-interest": "A shared interest",
  search: "Matches your search",
};
export function MatchProof({
  evidence,
  names = ["You", "They"],
}: {
  evidence: MatchEvidence[];
  names?: [string, string];
}) {
  return (
    <ul className="proof-list">
      {evidence.map((e, i) => (
        <li key={i}>
          <strong>
            {e.direction === "they-help-you"
              ? `${names[1]} can help ${names[0] === "You" ? "you" : names[0]}`
              : e.direction === "you-help-them"
                ? `${names[0]} can help ${names[1] === "They" ? "them" : names[1]}`
                : e.direction === "search"
                  ? "Profile evidence"
                  : "Shared project interest"}
          </strong>
          <span>
            “{e.yourExcerpt}” ↔ “{e.theirExcerpt}”
          </span>
          <small>Matched terms: {e.terms.join(", ")}</small>
        </li>
      ))}
    </ul>
  );
}
export function StagePreview({ snapshot }: { snapshot: StageSnapshot }) {
  return (
    <div className="stage-preview">
      <div className="contestant-pair">
        {snapshot.people.map((person, i) => (
          <section className="contestant" key={i}>
            <Avatar seed={person.avatarSeed} size={64} />
            <h3>{person.displayName}</h3>
            {person.canHelpWith && (
              <p>
                <strong>Offers</strong> {person.canHelpWith}
              </p>
            )}
            {person.lookingFor && (
              <p>
                <strong>Needs</strong> {person.lookingFor}
              </p>
            )}
            {person.building && (
              <p className="contestant-building">
                <strong>Building</strong> {person.building}
              </p>
            )}
            {snapshot.jokes[i] && <blockquote>{snapshot.jokes[i]}</blockquote>}
          </section>
        ))}
      </div>
      <p className="match-category">{CATEGORY_LABELS[snapshot.category]}</p>
      <MatchProof
        evidence={snapshot.evidence}
        names={[snapshot.people[0].displayName, snapshot.people[1].displayName]}
      />
      <div className="first-date">
        <span className="eyebrow">YOUR FIRST TEN MINUTES · SUGGESTION</span>
        <p>{snapshot.suggestedTask}</p>
      </div>
    </div>
  );
}
