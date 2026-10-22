"use client";

import { MobileSheet } from "@/components/ui/mobile-sheet";
import { MatchProof, StagePreview, CATEGORY_LABELS } from "@/components/matching/match-proof";
import { ProfileEditor, type MatchProfile } from "@/components/matching/profile-editor";
import { HOST_LINES, PERSONAL_JOKES } from "@/lib/connections/content";
import type { Connection, ConnectionAction, RecommendResult } from "@/lib/types";
import { ArrowRight, Search, Sparkles, HeartHandshake } from "lucide-react";
import { useState } from "react";

const SUGGESTIONS = ["Who is building AI agents?", "Who wants to collab on event tooling?"];
type Props = {
  onAsk: (query?: string) => Promise<{ matches: RecommendResult[]; source: string }>;
  onSelect: (id: string) => void;
  attendeeIds: string[];
  profile: MatchProfile;
  visible: boolean;
  slug: string;
  connections: Connection[];
  connectionError: string | null;
  onSaveProfile: (profile: { building: string; canHelpWith: string; lookingFor: string }) => Promise<void>;
  onRequest: (id: string) => Promise<void>;
  onUpdate: (id: string, action: ConnectionAction) => Promise<void>;
};
export function AskGrokPanel(props: Props) {
  const { onAsk, onSelect, attendeeIds, profile, visible, slug, connections, connectionError } = props;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [matches, setMatches] = useState<RecommendResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [editing, setEditing] = useState(false);
  const complete = !!profile.canHelpWith?.trim() && !!profile.lookingFor?.trim();
  const currentMatches = visible ? matches.filter((m) => attendeeIds.includes(m.membershipId)) : [];

  async function perform(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true); setError(null); setNote(null);
    try { await action(); } catch (e) { setError(e instanceof Error ? e.message : "Please retry."); } finally { setBusy(false); }
  }
  async function runAsk(q?: string) {
    if (busy || (q !== undefined && !q.trim())) return;
    await perform(async () => {
      setMatches([]); setSearched(false);
      const result = await onAsk(q?.trim()); setMatches(result.matches); setSearched(true);
    });
  }
  const activeCount = connections.filter((c) => c.status === "pending" && c.role === "recipient").length;
  return <>
    <button type="button" className="dock-item dock-find" onClick={() => setOpen(true)} aria-label="Find people to meet"><Sparkles size={21} /><span>Find my collaborator{activeCount ? ` (${activeCount})` : ""}</span></button>
    <MobileSheet open={open} onOpenChange={setOpen} title="Love at First Bot" description="A collaborator. A good reason. A slightly dramatic introduction." closeLabel="Close matching">
      <div className="show-marquee"><span className="eyebrow">BUMPIN PRESENTS</span><p>{HOST_LINES[0]}</p><span className="source-label">Source: Rules-based matching · No external AI</span></div>
      {!visible && <p className="info-note">Become visible using the event header to discover collaborators or receive introductions.</p>}
      {(!complete || editing) ? <ProfileEditor profile={profile} busy={busy} onSave={(values) => perform(async () => { await props.onSaveProfile(values); setEditing(false); setMatches([]); setSearched(false); setNote("Profile saved. Your next hello starts here."); })} /> : <div className="matching-start"><button type="button" className="primary-button show-button" disabled={busy || !visible} onClick={() => void runAsk()}><HeartHandshake size={21} />{busy ? "Checking the chemistry…" : "Find my collaborator"}</button><button type="button" className="text-button" onClick={() => setEditing(true)}>Edit my offers & needs</button></div>}
      <details className="search-details"><summary>Or search for a skill or project</summary><div className="suggestions">{SUGGESTIONS.map((s) => <button disabled={busy || !visible} key={s} type="button" onClick={() => { setQuery(s); void runAsk(s); }}>{s}<ArrowRight size={16} /></button>)}</div><form className="matching-form" onSubmit={(e) => { e.preventDefault(); void runAsk(query); }}><label className="field"><span>Who would you like to meet?</span><textarea name="query" maxLength={300} value={query} disabled={busy} onChange={(e) => setQuery(e.target.value)} rows={2} placeholder="A skill, a project, a shared ambition…" /></label><button type="submit" disabled={busy || !visible || !query.trim()} className="secondary-button"><Search size={19} />Find a connection</button></form></details>
      <div aria-live="polite" aria-busy={busy}>{(error || connectionError) && <p role="alert" className="error-note">{error || connectionError}</p>}{note && <p role="status" className="info-note">{note}</p>}{searched && currentMatches.length === 0 && <p role="status" className="info-note">No matching attendees yet. Try a skill or project mentioned in a profile.</p>}</div>
      <ul className="match-list">{currentMatches.map((m) => <li key={m.membershipId} className="match-card"><span className="match-category">{CATEGORY_LABELS[m.category]}</span><button type="button" className="match-name match-profile-link" onClick={() => { setOpen(false); onSelect(m.membershipId); }} aria-label={`Open profile for ${m.displayName}`}>{m.displayName}<ArrowRight size={18} /></button><p className="match-reason">{m.reason}</p><MatchProof evidence={m.evidence} />{m.category !== "search" && <button type="button" className="secondary-button" disabled={busy || !visible} onClick={() => void perform(async () => { await props.onRequest(m.membershipId); setNote("Introduction recorded. See your requests below."); })}>Request introduction</button>}{m.category === "search" && <p className="privacy-note">Use profile matchmaking to request an introduction with complementary evidence.</p>}</li>)}</ul>
      <section className="connections-section"><div className="section-heading"><h2>Your introductions <span>{connections.length}</span></h2></div><p className="host-aside">{HOST_LINES[1]}</p>{!connections.length && <p className="muted">Requests appear here. A suggestion becomes a connection only when you both say yes.</p>}<ul className="connection-list">{connections.map((c) => {
        const other = c.snapshot.people[c.role === "sender" ? 1 : 0];
        return <li className={`connection-card connection-${c.status}`} key={c.id}><div className="connection-topline"><h3>{other.displayName}</h3><span className="connection-state">{c.status}</span></div><p className="muted">{c.role === "sender" ? "You requested an introduction." : "They requested an introduction."}</p>{c.status === "pending" && <div className="action-row">{c.role === "recipient" ? <><button className="primary-button" disabled={busy} onClick={() => void perform(() => props.onUpdate(c.id, { action: "accept" }))}>Let’s connect</button><button className="secondary-button" disabled={busy} onClick={() => void perform(() => props.onUpdate(c.id, { action: "decline" }))}>Pass</button></> : <button className="secondary-button" disabled={busy} onClick={() => void perform(() => props.onUpdate(c.id, { action: "withdraw" }))}>Withdraw request</button>}</div>}
          {c.status === "accepted" && <><div className="accepted-banner"><HeartHandshake size={24} /><strong>It’s a match. Go say hello.</strong></div><section className="conversation-starter"><h4>TRY THIS OPENING LINE · SUGGESTION</h4><p>{c.snapshot.conversationStarter}</p></section><div className="first-date"><span className="eyebrow">YOUR FIRST TEN MINUTES · SUGGESTION</span><p>{c.snapshot.suggestedTask}</p></div><details className="stage-controls"><summary>Take this match to the big screen</summary><p className="muted">Optional. Both of you must approve this exact preview. The link can then be viewed by anyone. Profile details below were captured when the introduction was requested.</p><div className="joke-picker" role="group" aria-label="My personal joke"><h4>My joke · optional</h4><button type="button" className="joke-option" aria-pressed={!c.ownJokeId} disabled={busy} onClick={() => void perform(() => props.onUpdate(c.id, { action: "chooseJoke", jokeId: null }))}>Skip my personal joke</button>{PERSONAL_JOKES.map((j) => <button type="button" className="joke-option" aria-pressed={c.ownJokeId === j.id} key={j.id} disabled={busy} onClick={() => void perform(() => props.onUpdate(c.id, { action: "chooseJoke", jokeId: j.id }))}>{j.text}</button>)}</div><p className="privacy-note">Changing a joke clears both approvals. Selecting a joke prepares the wording; the approval below permits publication.</p><h4 className="preview-label">EXACT STAGE PREVIEW</h4><StagePreview snapshot={c.snapshot} /><p role="status" className="consent-status">You: {c.ownStageApproved ? "approved" : "not approved"} · Partner: {c.otherStageApproved ? "approved" : "not approved"}</p>{c.ownStageApproved ? <button className="secondary-button" disabled={busy} onClick={() => void perform(() => props.onUpdate(c.id, { action: "revokeStage" }))}>Revoke stage permission</button> : <button className="primary-button" disabled={busy} onClick={() => void perform(() => props.onUpdate(c.id, { action: "approveStage", expectedRevision: c.revision }))}>Approve this exact stage preview</button>}{c.ownStageApproved && c.otherStageApproved && <a className="secondary-button stage-link" href={`/e/${slug}/show/${c.id}`} target="_blank" rel="noreferrer">Open big-screen reveal <ArrowRight size={18} /></a>}</details>{c.role === "sender" && <button className="text-button" disabled={busy} onClick={() => void perform(() => props.onUpdate(c.id, { action: "withdraw" }))}>Withdraw introduction</button>}</>}
        </li>;
      })}</ul></section>
    </MobileSheet>
  </>;
}
