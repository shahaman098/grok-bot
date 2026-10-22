"use client";

import { Avatar } from "@/components/ui/avatar";
import { MobileSheet } from "@/components/ui/mobile-sheet";
import type { PublicAttendee } from "@/lib/types";
import { ArrowUpRight, MapPin } from "lucide-react";

type Props = {
  attendee: PublicAttendee | null;
  eventName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};
export function ProfileSheet({
  attendee,
  eventName,
  open,
  onOpenChange,
}: Props) {
  if (!attendee) return null;
  return (
    <MobileSheet
      open={open}
      onOpenChange={onOpenChange}
      title={attendee.displayName}
      description="Self-declared attendee profile"
      closeLabel="Close profile"
      footer={
        attendee.linkedinUrl ? (
          <a
            href={attendee.linkedinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="primary-button"
          >
            Connect on LinkedIn
            <ArrowUpRight size={20} />
          </a>
        ) : undefined
      }
    >
      <div className="profile-identity">
        <Avatar
          seed={attendee.avatarSeed}
          photo={attendee.avatarUrl}
          size={80}
        />
        <span className="profile-badge">
          <MapPin size={14} /> At this event
        </span>
      </div>
      <p className="profile-event">{eventName}</p>
      {attendee.building && (
        <section className="profile-section">
          <h3>BUILDING</h3>
          <p>{attendee.building}</p>
        </section>
      )}
      {attendee.canHelpWith && (
        <section className="profile-section">
          <h3>CAN HELP WITH</h3>
          <p>{attendee.canHelpWith}</p>
        </section>
      )}
      {attendee.lookingFor && (
        <section className="profile-section">
          <h3>LOOKING FOR</h3>
          <p>{attendee.lookingFor}</p>
        </section>
      )}
      {!attendee.building && !attendee.lookingFor && (
        <p className="muted">
          Start with a hello. There’s a person behind this pin.
        </p>
      )}
      <p className="privacy-note">
        Markers are arranged around the venue, not anyone’s exact location.
      </p>
    </MobileSheet>
  );
}
