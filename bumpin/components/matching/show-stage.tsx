"use client";
import { useEffect, useRef, useState } from "react";
import { Brand } from "@/components/ui/brand";
import { StagePreview } from "@/components/matching/match-proof";
import { HOST_LINES } from "@/lib/connections/content";
import { getDemoStage } from "@/lib/demo/connections";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import type { StageSnapshot } from "@/lib/types";

export function ShowStage({
  slug,
  connectionId,
}: {
  slug: string;
  connectionId: string;
}) {
  const [snapshot, setSnapshot] = useState<StageSnapshot | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [error, setError] = useState(false);
  const signature = useRef("");
  const demo = !isSupabaseConfigured();
  useEffect(() => {
    let active = true;
    let pending = false;
    let controller: AbortController | undefined;
    async function refresh() {
      if (pending) return;
      pending = true;
      controller = new AbortController();
      const timeout = setTimeout(() => controller?.abort(), 5000);
      try {
        let next: StageSnapshot | null;
        if (demo) next = getDemoStage(slug, connectionId);
        else {
          const res = await fetch(
            `/api/stage/${encodeURIComponent(slug)}/${connectionId}`,
            { cache: "no-store", signal: controller.signal },
          );
          if (!res.ok) throw new Error("Cannot verify permission");
          next = (await res.json()).snapshot;
        }
        if (!active) return;
        const nextSignature = JSON.stringify(next);
        if (signature.current !== nextSignature) {
          signature.current = nextSignature;
          setRevealed(false);
        }
        setSnapshot(next);
        setError(false);
      } catch {
        if (active) {
          setSnapshot(null);
          setRevealed(false);
          setError(true);
          signature.current = "";
        }
      } finally {
        clearTimeout(timeout);
        pending = false;
      }
    }
    void refresh();
    const timer = setInterval(() => void refresh(), 2000);
    return () => {
      active = false;
      clearInterval(timer);
      controller?.abort();
    };
  }, [slug, connectionId, demo]);
  return (
    <main className={`show-stage ${revealed && snapshot ? "is-revealed" : ""}`}>
      <header className="stage-header">
        <Brand />
        <span className="stage-live-label">
          {demo
            ? "PREVIEW · THIS BROWSER ONLY"
            : "SHARED WITH BOTH PEOPLE’S PERMISSION"}
        </span>
      </header>
      <div className="stage-title">
        <span className="eyebrow">THE COLLABORATOR MATCHMAKING SHOW</span>
        <h1>
          Love at
          <br />
          <em>First Bot.</em>
        </h1>
        <p>{HOST_LINES[0]}</p>
      </div>
      {error ? (
        <p role="alert" className="error-note stage-waiting">
          Connection lost. The reveal is hidden until we can check both people’s
          permission again.
        </p>
      ) : !snapshot ? (
        <div className="stage-waiting" role="status">
          <h2>The stage is waiting.</h2>
          <p>
            This match needs both people’s approval. No attendee details are
            displayed.
          </p>
        </div>
      ) : !revealed ? (
        <div className="reveal-ready">
          <p>Both people approved. Cue the dramatic pause.</p>
          <button
            type="button"
            className="primary-button reveal-button"
            onClick={() => setRevealed(true)}
          >
            Reveal the match
          </button>
        </div>
      ) : (
        <div className="reveal-content">
          <p className="match-announcement">IT’S A MATCH!</p>
          <StagePreview snapshot={snapshot} />
          <p className="stage-host-line">
            Unlike your side projects, this introduction has a next step.
          </p>
          <button className="text-button" onClick={() => setRevealed(false)}>
            Reset reveal
          </button>
        </div>
      )}
      <footer className="stage-footer">
        Consenting attendees. Self-declared profiles. Rules-based introductions.{" "}
        <span>
          Names and details disappear when stage permission is withdrawn and the
          next check completes.
        </span>
      </footer>
    </main>
  );
}
