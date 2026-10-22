"use client";
import { useState } from "react";
export type MatchProfile = { building: string | null; canHelpWith?: string | null; lookingFor: string | null };
export function ProfileEditor({ profile, onSave, busy }: { profile: MatchProfile; onSave: (values: { building: string; canHelpWith: string; lookingFor: string }) => Promise<void>; busy: boolean }) {
  const [offers, setOffers] = useState(profile.canHelpWith ?? "");
  const [needs, setNeeds] = useState(profile.lookingFor ?? "");
  const [building, setBuilding] = useState(profile.building ?? "");
  return <form className="profile-editor" onSubmit={(e) => { e.preventDefault(); void onSave({ canHelpWith: offers, lookingFor: needs, building }); }}><p className="muted">Tell the matchmaker what you offer and need. These answers are self-declared.</p><label className="field"><span>I can help with</span><input name="canHelpWith" maxLength={200} value={offers} onChange={(e) => setOffers(e.target.value)} disabled={busy} required /></label><label className="field"><span>I’m looking for</span><input name="lookingFor" maxLength={200} value={needs} onChange={(e) => setNeeds(e.target.value)} disabled={busy} required /></label><label className="field"><span>I’m building (optional)</span><input name="building" maxLength={200} value={building} onChange={(e) => setBuilding(e.target.value)} disabled={busy} /></label><button className="primary-button" disabled={busy || !offers.trim() || !needs.trim()}>{busy ? "Saving…" : "Save matchmaking profile"}</button></form>;
}
