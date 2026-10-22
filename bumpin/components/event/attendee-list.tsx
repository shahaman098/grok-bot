"use client";

import { Avatar } from "@/components/ui/avatar";
import type { PublicAttendee } from "@/lib/types";
import { ArrowUpRight, Share2, UsersRound } from "lucide-react";

type Props = {
  attendees: PublicAttendee[];
  onSelect: (attendee: PublicAttendee) => void;
  onShare?: () => void;
};
export function AttendeeList({ attendees, onSelect, onShare }: Props) {
  const people = attendees.filter((a) => !a.isSelf);
  return (
    <div className="people-view">
      <div className="people-intro">
        <p className="eyebrow">LESS SCROLLING. MORE HELLOS.</p>
        <h1>
          In good company<span className="accent">.</span>
        </h1>
        <p className="muted">
          Find a familiar interest. Start a new conversation.
        </p>
      </div>
      <div className="section-heading">
        <h2>
          At this event <span>{people.length}</span>
        </h2>
        <span className="small-label">Opted-in attendees</span>
      </div>
      {people.length === 0 ? (
        <div className="empty-people">
          <span className="empty-icon">
            <UsersRound size={28} />
          </span>
          <h2>The next hello starts here.</h2>
          <p>
            No other visible attendees yet. Invite someone at the event to join
            you.
          </p>
          {onShare && (
            <button
              type="button"
              className="secondary-button"
              onClick={onShare}
            >
              <Share2 size={18} /> Share event link
            </button>
          )}
        </div>
      ) : (
        <ul className="people-grid">
          {people.map((person) => (
            <li key={person.membershipId}>
              <button
                type="button"
                className="person-card"
                aria-label={`Open profile for ${person.displayName}`}
                onClick={() => onSelect(person)}
              >
                <Avatar
                  seed={person.avatarSeed}
                  photo={person.avatarUrl}
                  size={56}
                />
                <span className="person-copy">
                  <span className="person-name">{person.displayName}</span>
                  <span className="person-detail">
                    {person.building ||
                      person.lookingFor ||
                      "Here to connect. Start with a hello."}
                  </span>
                  <span className="person-tag">
                    {person.building
                      ? "Building something"
                      : person.lookingFor
                        ? "Looking to connect"
                        : "At this event"}
                  </span>
                </span>
                <ArrowUpRight className="person-arrow" size={20} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="list-footnote">
        A room full of possibilities. One conversation at a time.
      </p>
    </div>
  );
}
