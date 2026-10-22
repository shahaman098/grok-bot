"use client";

import { Avatar } from "@/components/ui/avatar";
import { MobileSheet } from "@/components/ui/mobile-sheet";
import type { PublicAttendee } from "@/lib/types";
import { normalizeLinkedInUrl } from "@/lib/validation";
import { ArrowUpRight, MapPin } from "lucide-react";
import { useState } from "react";
import "./profile-sheet.css";

type Props = {
  attendee: PublicAttendee | null;
  eventName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveLinkedIn?: (url: string) => Promise<void>;
};

function LinkedInEditor({ url, onSave }: {
  url: string | null;
  onSave: (url: string) => Promise<void>;
}) {
  const [value, setValue] = useState(url ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  return (
    <details className="optional-fields profile-link-editor">
      <summary>{url ? "Edit your LinkedIn link" : "Add your LinkedIn link"}</summary>
      <form className="optional-content" onSubmit={async (event) => {
        event.preventDefault();
        if (busy) return;
        setBusy(true);
        setError(null);
        setSaved(false);
        try {
          await onSave(value);
          setSaved(true);
        } catch (e) {
          setError(e instanceof Error ? e.message : "Could not save your link. Try again.");
        } finally { setBusy(false); }
      }}>
        <label className="field">
          <span>Your LinkedIn profile URL</span>
          <input name="linkedinUrl" inputMode="url" autoCapitalize="none" autoCorrect="off"
            maxLength={2048} placeholder="linkedin.com/in/your-name" value={value}
            onChange={(e) => { setValue(e.target.value); setSaved(false); }} disabled={busy}
            aria-describedby="linkedin-sharing-note" />
        </label>
        <p id="linkedin-sharing-note" className="muted">
          Optional. Other attendees can open this link when your profile is visible.
          LinkedIn sign-in does not supply your public profile link. Clear it to remove it.
        </p>
        {error && <p role="alert" className="error-note">{error}</p>}
        {saved && <p role="status">LinkedIn link saved.</p>}
        <button className="primary-button" disabled={busy}>{busy ? "Saving…" : "Save LinkedIn link"}</button>
      </form>
    </details>
  );
}

export function ProfileSheet({
  attendee,
  eventName,
  open,
  onOpenChange,
  onSaveLinkedIn,
}: Props) {
  if (!attendee) return null;
  const linkedinUrl = normalizeLinkedInUrl(attendee.linkedinUrl);
  return (
    <MobileSheet
      open={open}
      onOpenChange={onOpenChange}
      title={attendee.displayName}
      description="Full shared profile · visible to this event"
      closeLabel="Close profile"
      footer={
        linkedinUrl ? (
          <a
            href={linkedinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="primary-button"
          >
            {attendee.isSelf ? "View your LinkedIn profile" : "Connect on LinkedIn"}
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
          <MapPin size={14} /> {attendee.isSelf ? "You · visible at this event" : "At this event"}
        </span>
      </div>
      <p className="profile-event">{eventName}</p>
      {attendee.building && (
        <section className="profile-section">
          <h3>{attendee.isSelf ? "WHAT YOU’RE BUILDING" : "WHAT THEY’RE BUILDING"}</h3>
          <p>{attendee.building}</p>
        </section>
      )}
      {attendee.canHelpWith && (
        <section className="profile-section">
          <h3>SKILLS &amp; HELP OFFERED</h3>
          <p>{attendee.canHelpWith}</p>
        </section>
      )}
      {attendee.lookingFor && (
        <section className="profile-section">
          <h3>LOOKING FOR</h3>
          <p>{attendee.lookingFor}</p>
        </section>
      )}
      {!attendee.building && !attendee.canHelpWith && !attendee.lookingFor && (
        <p className="muted">
          {attendee.isSelf ? "Add your project, offers and needs in Introductions so others can learn about you." : "No profile details shared yet. Start with a hello."}
        </p>
      )}
      <section className="profile-section profile-link-section" aria-label="LinkedIn profile">
        <h3>LINKEDIN</h3>
        {linkedinUrl ? (
          <>
            <p className="profile-link-address">{linkedinUrl.replace("https://www.", "")}</p>
            <p className="muted">{attendee.isSelf ? "Open your LinkedIn profile for work experience, education and other details you share there." : "See their work experience, education and other details on LinkedIn. Choose Connect on their LinkedIn profile to send a connection request."}</p>
          </>
        ) : (
          <p className="muted">{attendee.isSelf ? "Your LinkedIn profile link hasn’t been shared yet." : "This attendee hasn’t shared a LinkedIn profile link yet."}</p>
        )}
        {attendee.isSelf && onSaveLinkedIn && (
          <LinkedInEditor key={attendee.membershipId} url={linkedinUrl} onSave={onSaveLinkedIn} />
        )}
      </section>
      <p className="profile-source-note">Offers, projects and goals are shared by the attendee. Work history and skills are not automatically imported from LinkedIn.</p>
      <p className="privacy-note">
        Markers are arranged around the venue, not anyone’s exact location.
      </p>
    </MobileSheet>
  );
}
