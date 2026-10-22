"use client";

import { randomAvatarSeed } from "@/lib/avatars";
import { Avatar } from "@/components/ui/avatar";
import { Brand } from "@/components/ui/brand";
import type { LinkedInIdentity } from "@/lib/auth/linkedin";
import { ArrowRight } from "lucide-react";
import { useState } from "react";

export type JoinFormValues = {
  displayName: string;
  linkedinUrl: string;
  avatarSeed: string;
  building: string;
  lookingFor: string;
  canHelpWith: string;
  visible: boolean;
};
type Props = {
  eventName: string;
  initial?: Partial<JoinFormValues>;
  identity?: LinkedInIdentity | null;
  linkedinAvailable?: boolean;
  onLinkedIn?: () => Promise<void>;
  onSubmit: (values: JoinFormValues) => Promise<void>;
  busy?: boolean;
};

export function JoinCard({
  eventName,
  initial,
  identity,
  linkedinAvailable = false,
  onLinkedIn,
  onSubmit,
  busy,
}: Props) {
  const [avatarSeed] = useState(
    () => initial?.avatarSeed ?? randomAvatarSeed(),
  );
  const [guestName] = useState(
    () =>
      initial?.displayName ||
      `Guest ${randomAvatarSeed().slice(0, 4).toUpperCase()}`,
  );
  function enter() {
    if (busy) return;
    void onSubmit({
      displayName: identity?.displayName ?? guestName,
      linkedinUrl: initial?.linkedinUrl ?? "",
      avatarSeed,
      building: initial?.building ?? "",
      lookingFor: initial?.lookingFor ?? "",
      canHelpWith: initial?.canHelpWith ?? "",
      visible: true,
    });
  }
  return (
    <section className="join-card quick-join-card minimal-entry">
      <Brand />
      <div className="join-intro">
        <p className="eyebrow">LOVE AT FIRST BOT</p>
        <h1>
          Your people.
          <br />
          One hello away.
        </h1>
        <p className="muted">Bring your LinkedIn. Skip the forms.</p>
      </div>
      <div className="join-event">
        <span className="status-dot" />
        <p>{eventName}</p>
      </div>
      {identity && (
        <div className="join-identity">
          <Avatar seed={avatarSeed} photo={identity.avatarUrl} size={48} />
          <div>
            <strong>{identity.displayName}</strong>
            <span>Ready to join</span>
          </div>
        </div>
      )}
      <div
        className={`social-entry ${!identity && !linkedinAvailable ? "linkedin-off" : ""}`}
      >
        <button
          type="button"
          className="linkedin-button"
          disabled={busy || (!identity && !linkedinAvailable)}
          onClick={() => (identity ? enter() : void onLinkedIn?.())}
        >
          <span className="linkedin-mark" aria-hidden="true">
            in
          </span>
          {busy
            ? "Connecting…"
            : identity
              ? "Join event"
              : "Join with LinkedIn"}
          <ArrowRight size={19} />
        </button>
        <p className="entry-note entry-sharing">
          Joining puts you on the attendee map automatically. You can hide any
          time. Big-screen sharing needs separate approval.
        </p>
        {!identity && !linkedinAvailable && (
          <p className="entry-note" role="status">
            LinkedIn is being set up. Guest entry is ready.
          </p>
        )}
        {!identity && (
          <button
            type="button"
            className="text-button guest-entry-button"
            disabled={busy}
            onClick={enter}
          >
            Continue as guest <ArrowRight size={15} />
          </button>
        )}
        {!identity && (
          <p className="entry-note guest-entry-note">
            Your guest name appears on the map. No details needed.
          </p>
        )}
      </div>
      <p className="entry-note entry-footnote">
        Name and photo only. Add match preferences once you’re in.
      </p>
    </section>
  );
}
