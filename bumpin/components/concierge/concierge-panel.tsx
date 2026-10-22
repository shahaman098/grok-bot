"use client";

import { useEffect, useRef, useState } from "react";
import {
  AudioLines,
  ArrowUpRight,
  MapPin,
  Mic,
  MicOff,
  PhoneOff,
  Search,
} from "lucide-react";
import { MobileSheet } from "@/components/ui/mobile-sheet";
import {
  ConciergeVoiceSession,
  type Caption,
  type VoiceState,
} from "@/lib/concierge/voice-session";
import { parseVoiceTool } from "@/lib/concierge/tools";
import { availableMatches } from "@/lib/concierge/available-matches";
import type { AccessStatus } from "@/lib/concierge/access";
import type { PublicAttendee, RecommendResult } from "@/lib/types";
import styles from "./styles";

export type ConciergeSearchResult = {
  matches: RecommendResult[];
  source: string;
  fallbackReason?: string;
};
type Props = {
  slug: string;
  visible: boolean;
  demoMode: boolean;
  attendees: PublicAttendee[];
  onAsk: (
    query: string,
    signal?: AbortSignal,
  ) => Promise<ConciergeSearchResult>;
  onMatches: (matches: RecommendResult[]) => void;
  onFocus: (membershipId: string) => boolean;
};

const STATE_LABEL: Record<VoiceState, string> = {
  idle: "Your next hello starts here.",
  connecting: "Connecting your concierge…",
  listening: "Listening. Who are you looking for?",
  thinking: "Finding a good reason to meet…",
  speaking: "Your concierge is speaking",
  error: "You can still type below.",
};

export function ConciergePanel(props: Props) {
  const [open, setOpen] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [access, setAccess] = useState<AccessStatus>("required");
  const [requesting, setRequesting] = useState(false);
  const [state, setState] = useState<VoiceState>("idle");
  const [muted, setMuted] = useState(false);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [results, setResults] = useState<ConciergeSearchResult | null>(null);
  const controller = useRef<ConciergeVoiceSession | null>(null);
  const searchAbort = useRef<AbortController | null>(null);
  const revision = useRef(0);
  const latest = useRef(props);
  const active = !["idle", "error"].includes(state);

  useEffect(() => {
    latest.current = props;
  }, [props]);
  useEffect(() => {
    const abort = new AbortController();
    async function refresh() {
      try {
        const response = await fetch(`/api/concierge/config?eventSlug=${encodeURIComponent(props.slug)}`, {
          signal: abort.signal, cache: "no-store",
        });
        const config = response.ok ? await response.json() : {};
        if (abort.signal.aborted) return;
        const status: AccessStatus = ["pending", "approved", "revoked"].includes(config.access)
          ? config.access : "required";
        setAccess(status);
        setVoiceEnabled(status === "approved" && config.voiceEnabled === true);
        if (status !== "approved") controller.current?.stop();
      } catch {
        if (!abort.signal.aborted) {
          setVoiceEnabled(false);
          setAccess("required");
          controller.current?.stop();
        }
      }
    }
    void refresh();
    const timer = open || active ? setInterval(() => void refresh(), 30_000) : undefined;
    return () => { abort.abort(); clearInterval(timer); };
  }, [props.slug, props.visible, open, active]);
  useEffect(() => {
    const stop = () => {
      if (document.hidden) controller.current?.stop();
    };
    document.addEventListener("visibilitychange", stop);
    return () => {
      document.removeEventListener("visibilitychange", stop);
      controller.current?.dispose();
      searchAbort.current?.abort();
    };
  }, []);
  useEffect(() => {
    if (!props.visible) {
      controller.current?.stop();
      searchAbort.current?.abort();
      revision.current++;
    }
  }, [props.visible]);

  async function search(text: string, signal?: AbortSignal) {
    const current = ++revision.current;
    searchAbort.current?.abort();
    const abort = new AbortController();
    searchAbort.current = abort;
    const cancel = () => abort.abort();
    if (signal?.aborted) abort.abort();
    signal?.addEventListener("abort", cancel, { once: true });
    setBusy(true);
    setError(null);
    try {
      if (!latest.current.visible)
        throw new Error("Become visible to find people at this event.");
      const result = await latest.current.onAsk(text, abort.signal);
      if (
        abort.signal.aborted ||
        current !== revision.current ||
        !latest.current.visible
      )
        return { error: "This search was replaced by a newer request." };
      const matches = availableMatches(
        result.matches,
        latest.current.attendees,
      ).slice(0, 3);
      setResults({ ...result, matches });
      latest.current.onMatches(matches);
      if (matches.length) setOpen(false);
      return {
        matches: matches.map((m) => ({
          membershipId: m.membershipId,
          displayName: m.displayName,
          reason: m.reason,
          evidence: m.evidence.map((e) => e.theirExcerpt),
        })),
        source: result.source,
        mapUpdated: matches.length > 0,
        note:
          result.fallbackReason ??
          "Venue markers do not represent physical positions.",
      };
    } catch (e) {
      if (abort.signal.aborted || current !== revision.current)
        return { error: "Search cancelled." };
      const message =
        e instanceof Error
          ? e.message
          : "Could not find matches. Please retry.";
      setError(message);
      return { error: message };
    } finally {
      signal?.removeEventListener("abort", cancel);
      if (current === revision.current) setBusy(false);
    }
  }

  async function start() {
    if (active || access !== "approved" || !voiceEnabled) return;
    setError(null);
    setCaptions([]);
    setMuted(false);
    controller.current?.dispose();
    const voice = new ConciergeVoiceSession({
      onState: setState,
      onError: setError,
      onCaption: (caption) =>
        setCaptions((current) =>
          [...current.filter((c) => c.id !== caption.id), caption].slice(-12),
        ),
      tool: async (name, args, signal) => {
        const tool = parseVoiceTool(name, args);
        if (tool.name === "find_people") return search(tool.query, signal);
        if (
          !latest.current.visible ||
          !latest.current.onFocus(tool.membershipId)
        )
          return { error: "That match is no longer available. Search again." };
        setOpen(false);
        return {
          focused: true,
          note: "Highlighted the attendee’s venue marker; this is not their physical location.",
        };
      },
    });
    controller.current = voice;
    await voice.start(props.slug);
  }

  async function requestAccess() {
    setRequesting(true);
    setError(null);
    try {
      const response = await fetch("/api/concierge/access", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventSlug: props.slug }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not request access.");
      if (!["pending", "approved", "revoked"].includes(result.access))
        throw new Error("Could not confirm your access request. Please retry.");
      setAccess(result.access);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not request access.");
    } finally {
      setRequesting(false);
    }
  }

  function end() {
    controller.current?.stop();
    setMuted(false);
  }
  function toggleMute() {
    const value = !muted;
    controller.current?.mute(value);
    setMuted(value);
  }
  function close(value: boolean) {
    setOpen(value);
    if (!value) end();
  }
  const currentMatches = props.visible
    ? availableMatches(results?.matches ?? [], props.attendees)
    : [];

  return (
    <>
      <button
        type="button"
        className="dock-item dock-find dock-concierge"
        onClick={() => setOpen(true)}
        aria-label="Concierge – open voice concierge"
      >
        <AudioLines size={22} />
        <span>Concierge</span>
      </button>
      <MobileSheet
        open={open}
        onOpenChange={close}
        title="Your networking concierge"
        description="Tell us who you’re looking for. Leave with a reason to say hello."
        closeLabel="Close concierge"
      >
        <section className={styles.hero} aria-label="Voice concierge">
          <span className={styles.eyebrow}>BUMPIN · YOUR PEOPLE, FOUND</span>
          <div
            className={`${styles.orb} ${active ? styles.live : ""}`}
            aria-hidden="true"
          >
            <AudioLines size={42} />
            <span />
            <span />
            <span />
          </div>
          <h2>
            One conversation.
            <br />
            <em>A better connection.</em>
          </h2>
          <p className={styles.status} role="status">
            {muted && active ? "Microphone muted" : STATE_LABEL[state]}
          </p>
          {!props.visible && (
            <p className="info-note">
              Use the event header to become visible, then find your people.
            </p>
          )}
          {active ? (
            <div className={styles.controls}>
              <button
                type="button"
                className="secondary-button"
                onClick={toggleMute}
                aria-pressed={muted}
              >
                {muted ? <MicOff size={18} /> : <Mic size={18} />}{" "}
                {muted ? "Unmute" : "Mute"}
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={() => controller.current?.interrupt()}
              >
                Interrupt
              </button>
              <button type="button" className={styles.end} onClick={end}>
                <PhoneOff size={18} /> End
              </button>
            </div>
          ) : access !== "approved" ? (
            <button type="button" className={`primary-button ${styles.start}`}
              disabled={!props.visible || props.demoMode || requesting || access !== "required"}
              onClick={() => void requestAccess()}>
              <Mic size={19} />
              {requesting ? "Requesting…" : access === "pending" ? "Access requested" : access === "revoked" ? "Access unavailable" : "Request access"}
              <ArrowUpRight size={19} />
            </button>
          ) : (
            <button
              type="button"
              className={`primary-button ${styles.start}`}
              disabled={!props.visible || !voiceEnabled || props.demoMode}
              onClick={() => void start()}
            >
              <Mic size={19} /> Start talking <ArrowUpRight size={19} />
            </button>
          )}
          {access !== "approved" ? (
            <p className={styles.hint} role="status">
              {access === "pending"
                ? "Your request is pending approval. Voice and AI matching stay locked until approved."
                : access === "revoked"
                  ? "Paid AI access is unavailable for this account. Contact the event organiser."
                  : "Voice and AI matching are available by approval. Request access; basic typed matching is free."}
            </p>
          ) : (!voiceEnabled || props.demoMode) && (
            <p className={styles.hint}>
              Voice isn’t connected yet. Try a typed request below.
            </p>
          )}
          <p className={styles.disclosure}>
            Voice uses xAI to process audio and shared profile details. BumpIn
            doesn’t save recordings or transcripts.
          </p>
        </section>
        {error && (
          <p role="alert" className="info-note">
            {error}
          </p>
        )}
        {!!captions.length && (
          <div
            className={styles.captions}
            role="log"
            aria-label="Conversation captions"
            aria-live="polite"
          >
            {captions.slice(-4).map((c) => (
              <p key={c.id}>
                <strong>{c.role === "user" ? "You" : "Concierge"}</strong>
                {c.text}
              </p>
            ))}
          </div>
        )}
        <form
          className={styles.search}
          onSubmit={(e) => {
            e.preventDefault();
            if (query.trim()) void search(query.trim());
          }}
        >
          <label className="field">
            <span>Or tell us in a few words</span>
            <textarea
              name="conciergeQuery"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              maxLength={300}
              rows={2}
              placeholder="Someone who can help me build a voice agent…"
            />
          </label>
          <button
            type="submit"
            className="secondary-button"
            disabled={!props.visible || busy || !query.trim()}
          >
            <Search size={18} />
            {busy ? "Finding your people…" : "Find my people"}
          </button>
        </form>
        <div className={styles.examples}>
          <span>TRY ASKING</span>
          {["Who can help with React?", "Who’s building AI agents?"].map(
            (q) => (
              <button
                type="button"
                key={q}
                disabled={!props.visible || busy}
                onClick={() => {
                  setQuery(q);
                  void search(q);
                }}
              >
                {q}
                <ArrowUpRight size={15} />
              </button>
            ),
          )}
        </div>
        {results && (
          <p className={styles.hint} role="status">
            {results.source === "grok"
              ? "Semantic matching · grounded in shared profiles"
              : "Basic matching · shared profile terms"}
            {!currentMatches.length
              ? " · No matches yet. Try another skill or goal."
              : ""}
          </p>
        )}
        {results?.fallbackReason && (
          <p className={styles.hint}>{results.fallbackReason}</p>
        )}
        <ul className={styles.results}>
          {currentMatches.map((m, i) => (
            <li key={m.membershipId}>
              <span className={styles.number}>0{i + 1}</span>
              <div>
                <strong>{m.displayName}</strong>
                <p>{m.reason}</p>
              </div>
              <button
                type="button"
                className="icon-button"
                aria-label={`Show ${m.displayName} on map`}
                onClick={() => {
                  if (props.onFocus(m.membershipId)) setOpen(false);
                }}
              >
                <MapPin size={20} />
              </button>
            </li>
          ))}
        </ul>
      </MobileSheet>
      {active && !open && (
        <div
          className={styles.callbar}
          role="region"
          aria-label="Active voice concierge"
        >
          <button
            type="button"
            className={styles.resume}
            onClick={() => setOpen(true)}
          >
            <span className={styles.pulse} />
            <span>
              <strong>Concierge is with you</strong>
              <small>{muted ? "Microphone muted" : STATE_LABEL[state]}</small>
            </span>
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label={
              muted
                ? "Unmute concierge microphone"
                : "Mute concierge microphone"
            }
            aria-pressed={muted}
            onClick={toggleMute}
          >
            {muted ? <MicOff size={19} /> : <Mic size={19} />}
          </button>
          <button
            type="button"
            className={`icon-button ${styles.hangup}`}
            aria-label="End voice conversation"
            onClick={end}
          >
            <PhoneOff size={19} />
          </button>
        </div>
      )}
    </>
  );
}
