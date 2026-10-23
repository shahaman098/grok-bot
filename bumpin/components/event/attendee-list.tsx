"use client";

import { Avatar } from "@/components/ui/avatar";
import type { PublicAttendee } from "@/lib/types";
import { normalizeLinkedInUrl } from "@/lib/validation";
import { ArrowUpRight, Share2, UsersRound } from "lucide-react";
import "./attendee-list.css";
import { readProfessionalProfile } from "@/lib/professional-profile";

type Props = {
  attendees: PublicAttendee[];
  onSelect: (attendee: PublicAttendee) => void;
  onShare?: () => void;
};
export function AttendeeList({ attendees, onSelect, onShare }: Props) {
  const people = attendees;
  return (
    <div className="people-view">
      <div className="people-intro">
        <p className="eyebrow">LESS SCROLLING. MORE HELLOS.</p>
        <h1>
          In good company<span className="accent">.</span>
        </h1>
        <p className="muted">
          Explore shared profiles and connect on LinkedIn.
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
          {people.map((person) => {
            const linkedinUrl = normalizeLinkedInUrl(person.linkedinUrl);
            const professional = readProfessionalProfile(person.professionalProfile);
            return (
              <li key={person.membershipId} className="person-entry">
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
                    <span className="person-name">{person.displayName}{person.isSelf && " · You"}</span>
                    {professional?.headline && <span className="person-detail">{professional.headline}</span>}
                    {professional?.skills && <span className="person-detail">Skills: {professional.skills}</span>}
                    {person.building && <span className="person-detail">Building: {person.building}</span>}
                    {person.canHelpWith && <span className="person-detail">Can help: {person.canHelpWith}</span>}
                    {person.lookingFor && <span className="person-detail">Looking for: {person.lookingFor}</span>}
                    {!professional && !person.building && !person.canHelpWith && !person.lookingFor && (
                      <span className="person-detail">{person.isSelf ? "Add your project, offers and needs in Introductions." : "No profile details shared yet. Tap to say hello."}</span>
                    )}
                    <span className="person-tag">
                      {person.isSelf
                        ? "Your visible profile"
                        : person.building
                        ? "Building something"
                        : person.canHelpWith
                          ? "Here to help"
                        : person.lookingFor
                          ? "Looking to connect"
                          : "At this event"}
                    </span>
                  </span>
                  <ArrowUpRight className="person-arrow" size={20} />
                </button>
                <div className="person-linkedin">
                  {linkedinUrl ? (
                    <a href={linkedinUrl} target="_blank" rel="noopener noreferrer"
                      className="person-linkedin-action"
                      aria-label={person.isSelf ? "View your LinkedIn profile" : `Connect with ${person.displayName} on LinkedIn`}>
                      {person.isSelf ? "View your LinkedIn profile" : "Connect on LinkedIn"}
                      <ArrowUpRight size={16} aria-hidden="true" />
                    </a>
                  ) : person.isSelf ? (
                    <button type="button" className="person-linkedin-action" onClick={() => onSelect(person)}>
                      Add your LinkedIn link <ArrowUpRight size={16} aria-hidden="true" />
                    </button>
                  ) : (
                    <p className="person-linkedin-missing">LinkedIn link not shared yet</p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <p className="list-footnote">
        A room full of possibilities. One conversation at a time.
      </p>
    </div>
  );
}
