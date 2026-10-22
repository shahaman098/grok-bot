"use client";

import { ArrowUpRight, X } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import type { PublicAttendee, RecommendResult } from "@/lib/types";
import styles from "./styles";

export function MapMatches({
  matches,
  attendees,
  focusedId,
  onFocus,
  onOpen,
  onClear,
}: {
  matches: RecommendResult[];
  attendees: PublicAttendee[];
  focusedId: string | null;
  onFocus: (id: string) => void;
  onOpen: (person: PublicAttendee) => void;
  onClear: () => void;
}) {
  if (!matches.length) return null;
  return (
    <section className={styles.mapMatches} aria-label="Concierge matches">
      <div className={styles.mapHeading}>
        <span>
          YOUR PEOPLE · {matches.length}{" "}
          {matches.length === 1 ? "MATCH" : "MATCHES"}
        </span>
        <button
          type="button"
          className="icon-button"
          aria-label="Clear match highlights"
          onClick={onClear}
        >
          <X size={17} />
        </button>
      </div>
      <div className={styles.mapCards}>
        {matches.map((match, index) => {
          const person = attendees.find(
            (a) => a.membershipId === match.membershipId,
          );
          if (!person) return null;
          return (
            <article
              key={match.membershipId}
              className={`${styles.mapCard} ${focusedId === match.membershipId ? styles.focused : ""}`}
            >
              <button
                type="button"
                className={styles.matchFocus}
                onClick={() => onFocus(match.membershipId)}
                aria-label={`Highlight ${match.displayName} on map`}
                aria-pressed={focusedId === match.membershipId}
              >
                <span className={styles.matchAvatar}>
                  <Avatar
                    seed={person.avatarSeed}
                    photo={person.avatarUrl}
                    size={36}
                  />
                  <span>{index + 1}</span>
                </span>
                <span>
                  <strong>{match.displayName}</strong>
                  <small>
                    {match.source === "grok"
                      ? "Profile-grounded match"
                      : "Basic profile match"}
                  </small>
                </span>
              </button>
              <p>{match.reason}</p>
              <button
                type="button"
                className={styles.openProfile}
                aria-label={`Open matched profile for ${match.displayName}`}
                onClick={() => onOpen(person)}
              >
                Say hello <ArrowUpRight size={15} />
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
