"use client";

import { randomAvatarSeed } from "@/lib/avatars";
import { Avatar } from "@/components/ui/avatar";
import { Brand } from "@/components/ui/brand";
import { ArrowRight, ChevronDown, RefreshCw, ShieldCheck } from "lucide-react";
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
  onSubmit: (values: JoinFormValues) => Promise<void>;
  busy?: boolean;
};

export function JoinCard({ eventName, initial, onSubmit, busy }: Props) {
  const [displayName, setDisplayName] = useState(initial?.displayName ?? "");
  const [linkedinUrl, setLinkedinUrl] = useState(initial?.linkedinUrl ?? "");
  const [avatarSeed, setAvatarSeed] = useState(
    () => initial?.avatarSeed ?? randomAvatarSeed(),
  );
  const [building, setBuilding] = useState(initial?.building ?? "");
  const [lookingFor, setLookingFor] = useState(initial?.lookingFor ?? "");
  const [canHelpWith, setCanHelpWith] = useState(initial?.canHelpWith ?? "");
  const [visible, setVisible] = useState(initial?.visible ?? false);

  return (
    <section className="join-card">
      <Brand />
      <div className="join-intro">
        <p className="eyebrow">LOVE AT FIRST BOT · BY BUMPIN</p>
        <h1>
          Make your next
          <br />
          great connection.
        </h1>
        <p className="muted">Find a collaborator. Skip the awkward opening line.</p>
      </div>
      <div className="join-event">
        <span className="status-dot" />
        <p>{eventName}</p>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!busy && displayName.trim())
            void onSubmit({
              displayName,
              linkedinUrl,
              avatarSeed,
              building,
              lookingFor,
              canHelpWith,
              visible,
            });
        }}
      >
        <fieldset disabled={busy} className="join-fields">
          <div className="avatar-picker">
            <Avatar seed={avatarSeed} size={64} />
            <div>
              <p className="text-sm font-semibold">Your face in the crowd</p>
              <button
                type="button"
                className="text-button"
                onClick={() => setAvatarSeed(randomAvatarSeed())}
              >
                <RefreshCw size={15} /> New avatar
              </button>
            </div>
          </div>
          <label className="field">
            <span>What should we call you?</span>
            <input
              name="displayName"
              required
              maxLength={80}
              autoComplete="nickname"
              enterKeyHint="done"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
            />
          </label>
          <label className="field"><span>I can help with <span className="muted">(optional)</span></span><input name="canHelpWith" maxLength={200} value={canHelpWith} onChange={(e) => setCanHelpWith(e.target.value)} placeholder="React development, design, pitching…" /></label>
          <label className="field"><span>I’m looking for <span className="muted">(optional)</span></span><input name="lookingFor" maxLength={200} value={lookingFor} onChange={(e) => setLookingFor(e.target.value)} placeholder="A designer, a developer, a fresh perspective…" /></label>
          <details
            className="optional-fields"
            open={
              initial?.building || initial?.lookingFor || initial?.linkedinUrl
                ? true
                : undefined
            }
          >
            <summary>
              Add a little about you <span className="muted">Optional</span>
              <ChevronDown size={18} />
            </summary>
            <div className="optional-content">
              <label className="field">
                <span>
                  Building <span className="muted">(optional)</span>
                </span>
                <input
                  name="building"
                  maxLength={200}
                  value={building}
                  onChange={(e) => setBuilding(e.target.value)}
                  placeholder="An idea, a project, a big ambition…"
                />
              </label>
              <label className="field">
                <span>
                  LinkedIn URL <span className="muted">(optional)</span>
                </span>
                <input
                  name="linkedinUrl"
                  inputMode="url"
                  autoCapitalize="none"
                  autoCorrect="off"
                  autoComplete="url"
                  maxLength={2048}
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  placeholder="linkedin.com/in/you"
                />
              </label>
            </div>
          </details>
          <label className="consent-row">
            <input
              type="checkbox"
              name="visible"
              checked={visible}
              onChange={(e) => setVisible(e.target.checked)}
            />
            <span>
              <strong>Appear on attendee map</strong>
              <span>
                Let people at this event see your profile and request an introduction. Stage sharing is a separate choice. You can hide or leave
                anytime.
              </span>
            </span>
          </label>
          <button
            type="submit"
            disabled={busy || !displayName.trim()}
            className="primary-button"
          >
            {busy ? "Joining…" : "Join event"}
            <ArrowRight size={20} />
          </button>
        </fieldset>
      </form>
      <p className="privacy-note">
        <ShieldCheck size={16} /> Venue-based markers. No GPS collected.
      </p>
    </section>
  );
}
