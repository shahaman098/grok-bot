"use client";

import dynamic from "next/dynamic";
import { AskGrokPanel } from "@/components/grok/ask-grok-panel";
import { EventInfoSheet } from "@/components/event/event-info-sheet";
import { JoinCard, type JoinFormValues } from "@/components/join/join-card";
import { ProfileSheet } from "@/components/profile/profile-sheet";
import {
  getDemoMember,
  listDemoAttendees,
  removeDemoMember,
  setDemoVisibility,
  subscribeDemoPool,
  upsertDemoMember,
  updateDemoProfile,
} from "@/lib/demo/local-pool";
import { ensureSession } from "@/lib/auth/ensure-session";
import { createDemoConnection, listDemoConnections, updateDemoConnection } from "@/lib/demo/connections";
import type { MatchProfile } from "@/components/matching/profile-editor";
import { recommendForProfile, recommendRules } from "@/lib/matching/rules";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import type { Connection, ConnectionAction, PublicAttendee, RecommendResult } from "@/lib/types";
import { normalizeLinkedInUrl } from "@/lib/validation";
import {
  Eye,
  EyeOff,
  LogOut,
  Map as MapIcon,
  Share2,
  UsersRound,
  ChevronRight,
  LoaderCircle,
} from "lucide-react";
import { Brand } from "@/components/ui/brand";
import { AttendeeList } from "@/components/event/attendee-list";
import { useCallback, useEffect, useRef, useState } from "react";

const AttendeeMap = dynamic(
  () => import("@/components/map/attendee-map").then((m) => m.AttendeeMap),
  {
    ssr: false,
    loading: () => (
      <div className="map-loading" role="status">
        <LoaderCircle className="loading-spin" /> Opening the event map…
      </div>
    ),
  },
);

type EventMeta = {
  slug: string;
  name: string;
  venueName: string;
  venueLat: number;
  venueLng: number;
  lumaUrl: string;
  startsAt: string;
  endsAt: string;
};

type Props = {
  slug: string;
  initialEvent: EventMeta;
};

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, cache: "no-store" });
  const json = await res.json();
  if (!res.ok)
    throw new Error(json.error ?? "Request failed. Please try again.");
  return json as T;
}

export function EventExperience({ slug, initialEvent }: Props) {
  const [event] = useState(initialEvent);
  const [joined, setJoined] = useState(false);
  const [visible, setVisible] = useState(false);
  const [attendees, setAttendees] = useState<PublicAttendee[]>([]);
  const [selected, setSelected] = useState<PublicAttendee | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [eventOpen, setEventOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const refreshPending = useRef<Promise<void> | null>(null);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [matchProfile, setMatchProfile] = useState<MatchProfile>({ building: null, canHelpWith: null, lookingFor: null });
  const [demoMode] = useState(!isSupabaseConfigured());

  const [view, setView] = useState<"people" | "map">("people");
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(true);

  useEffect(() => {
    const viewport = window.visualViewport;
    const resize = () => {
      if (!viewport || viewport.scale === 1)
        document.documentElement.style.setProperty(
          "--app-height",
          `${viewport?.height ?? window.innerHeight}px`,
        );
    };
    resize();
    viewport?.addEventListener("resize", resize);
    window.addEventListener("resize", resize);
    return () => {
      viewport?.removeEventListener("resize", resize);
      window.removeEventListener("resize", resize);
      document.documentElement.style.removeProperty("--app-height");
    };
  }, []);

  async function shareEvent() {
    try {
      if (navigator.share)
        await navigator.share({ title: event.name, url: window.location.href });
      else {
        await navigator.clipboard.writeText(window.location.href);
        setShareStatus("Event link copied. Send it to someone in the room.");
      }
    } catch (e) {
      if (!(e instanceof Error && e.name === "AbortError"))
        setShareStatus(`Share this event: ${window.location.href}`);
    }
  }

  function selectAttendee(attendee: PublicAttendee) {
    setSelected(attendee);
    setProfileOpen(true);
  }

  const refreshAttendees = useCallback(async () => {
    if (demoMode) {
      setAttendees(listDemoAttendees(slug));
      setConnections(listDemoConnections(slug));
      const member = getDemoMember(slug);
      if (member) setMatchProfile(member);
      return;
    }
    if (!refreshPending.current) {
      refreshPending.current = requestJson<{ attendees: PublicAttendee[] }>(
        `/api/events/${slug}/attendees`,
      )
        .then(async (json) => {
          setAttendees(json.attendees);
          const self = json.attendees.find((a) => a.isSelf);
          if (self) setMatchProfile(self);
          try {
            const result = await requestJson<{ connections: Connection[] }>(`/api/connections?eventSlug=${encodeURIComponent(slug)}`);
            setConnections(result.connections); setConnectionError(null);
          } catch { setConnectionError("Could not refresh introductions. Your last confirmed requests are shown; please retry."); }
        })
        .finally(() => {
          refreshPending.current = null;
        });
    }
    await refreshPending.current;
  }, [demoMode, slug]);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        // Storage and authenticated membership are external sources of truth.
        await Promise.resolve();
        if (!active) return;
        if (demoMode) {
          const member = getDemoMember(slug);
          setJoined(!!member);
          setVisible(member?.visible ?? false);
          await refreshAttendees();
        } else {
          const result = await ensureSession();
          if (result.error) throw new Error(result.error);
          const { membership, profile } = await requestJson<{
            membership: { visible: boolean } | null;
            profile: MatchProfile | null;
          }>(`/api/me?eventSlug=${encodeURIComponent(slug)}`);
          if (!active) return;
          if (profile) setMatchProfile(profile);
          setJoined(!!membership);
          setVisible(membership?.visible ?? false);
          if (membership) await refreshAttendees();
        }
      } catch (e) {
        if (active)
          setError(
            e instanceof Error ? e.message : "Could not restore your session.",
          );
      } finally {
        if (active) setRestoring(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [demoMode, refreshAttendees, slug]);

  useEffect(() => {
    if (!joined) return;
    const refresh = () => {
      void refreshAttendees()
        .then(() => setSyncError(null))
        .catch(() => {
          setSyncError("Could not update attendees. Reconnecting…");
        });
    };
    if (demoMode) return subscribeDemoPool(slug, refresh);

    const supabase = createClient();
    const channel = supabase
      .channel(`memberships-${slug}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "event_memberships" },
        refresh,
      )
      .subscribe();
    // RLS restricts row-change delivery to the owner. Poll the safe RPC too,
    // so another member's join/hide/leave appears on every device.
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, 3000);
    window.addEventListener("online", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(timer);
      void supabase.removeChannel(channel);
      window.removeEventListener("online", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [demoMode, joined, refreshAttendees, slug]);

  async function handleJoin(values: JoinFormValues) {
    setBusy(true);
    setError(null);
    try {
      const linkedin = normalizeLinkedInUrl(values.linkedinUrl);
      if (values.linkedinUrl.trim() && !linkedin)
        throw new Error("Enter a valid HTTPS LinkedIn URL.");

      if (demoMode) {
        upsertDemoMember(slug, {
          displayName: values.displayName.trim(),
          linkedinUrl: linkedin,
          avatarSeed: values.avatarSeed,
          building: values.building.trim() || null,
          canHelpWith: values.canHelpWith.trim() || null,
          lookingFor: values.lookingFor.trim() || null,
          visible: values.visible,
          venueLat: event.venueLat,
          venueLng: event.venueLng,
        });
        setMatchProfile({ building: values.building, canHelpWith: values.canHelpWith, lookingFor: values.lookingFor });
        setJoined(true);
        setVisible(values.visible);
        setAttendees(listDemoAttendees(slug));
        return;
      }

      const sessionResult = await ensureSession();
      if (sessionResult.error) throw new Error(sessionResult.error);

      await requestJson("/api/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventSlug: slug,
          displayName: values.displayName,
          linkedinUrl: values.linkedinUrl,
          avatarSeed: values.avatarSeed,
          building: values.building,
          canHelpWith: values.canHelpWith,
          lookingFor: values.lookingFor,
          visible: values.visible,
          locationConsent: false,
        }),
      });

      setMatchProfile({ building: values.building, canHelpWith: values.canHelpWith, lookingFor: values.lookingFor });
      setJoined(true);
      setVisible(values.visible);
      await refreshAttendees();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function leaveEvent() {
    setBusy(true);
    setError(null);
    try {
      if (demoMode) {
        removeDemoMember(slug);
      } else
        await requestJson("/api/leave", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventSlug: slug }),
        });
      setJoined(false);
      setVisible(false);
      setAttendees([]);
      setConnections([]);
      setConnectionError(null);
      setSelected(null);
      setProfileOpen(false);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not leave. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function toggleVisibility() {
    const next = !visible;
    setBusy(true);
    setError(null);
    try {
      if (demoMode) {
        setDemoVisibility(slug, next);
      } else {
        await requestJson("/api/me", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventSlug: slug,
            visible: next,
            locationConsent: false,
          }),
        });
      }
      setVisible(next);
      await refreshAttendees();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not change visibility. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function askGrok(query?: string) {
    if (demoMode) {
      const self = getDemoMember(slug);
      const matches = query ? recommendRules(attendees, query) : self ? recommendForProfile(self, attendees) : [];
      return { matches, source: "rules" };
    }
    return requestJson<{ matches: RecommendResult[]; source: string }>(
      "/api/recommend",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventSlug: slug, query }),
      },
    );
  }

  async function saveMatchProfile(values: { building: string; canHelpWith: string; lookingFor: string }) {
    if (demoMode) updateDemoProfile(slug, values);
    else await requestJson("/api/me", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventSlug: slug, ...values }) });
    setMatchProfile(values);
    await refreshAttendees();
  }
  function recordConnection(connection: Connection) {
    setConnections((current) => [connection, ...current.filter((c) => c.id !== connection.id)]);
  }
  async function requestIntroduction(targetMembershipId: string) {
    if (demoMode) recordConnection(createDemoConnection(slug, targetMembershipId));
    else {
      const result = await requestJson<{ connection: Connection }>("/api/connections", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventSlug: slug, targetMembershipId }) });
      recordConnection(result.connection);
    }
    await refreshAttendees();
  }
  async function updateIntroduction(id: string, action: ConnectionAction) {
    if (demoMode) recordConnection(updateDemoConnection(slug, id, action));
    else {
      const result = await requestJson<{ connection: Connection }>(`/api/connections/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(action) });
      recordConnection(result.connection);
    }
    await refreshAttendees();
  }

  const visibleCount = attendees.filter((a) => !a.isSelf).length;
  const currentAttendee =
    attendees.find((a) => a.membershipId === selected?.membershipId) ?? null;

  if (restoring)
    return (
      <main className="restoring-screen">
        <Brand />
        <div role="status">
          <LoaderCircle className="loading-spin" size={24} />
          <p>Finding your place in the room…</p>
        </div>
      </main>
    );

  if (!joined)
    return (
      <main className="join-page">
        <div className="join-wrapper">
          {demoMode && (
            <p className="demo-banner">
              Preview mode · attendees sync between tabs on this browser.
            </p>
          )}
          {error && (
            <p role="alert" className="error-note">
              {error}
            </p>
          )}
          <JoinCard eventName={event.name} onSubmit={handleJoin} busy={busy} />
          <p className="join-bottom-note">
            Made for moments that turn into something.
          </p>
        </div>
      </main>
    );

  return (
    <div className="event-shell">
      <header className="app-header">
        <div className="app-topline">
          <Brand />
          <div className="header-actions">
            <button
              type="button"
              onClick={() => void shareEvent()}
              className="icon-button"
              aria-label="Share event"
            >
              <Share2 size={20} />
            </button>
            <button
              type="button"
              onClick={() => void leaveEvent()}
              disabled={busy}
              className="icon-button"
              aria-label="Leave"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
        <div className="event-summary">
          <button
            type="button"
            className="event-summary-button"
            onClick={() => setEventOpen(true)}
            aria-label="Event details"
          >
            <span className="eyebrow">YOU’RE IN THE ROOM</span>
            <span className="event-summary-title">{event.name}</span>
            <span className="event-summary-meta">
              <span className="status-dot" />
              {visibleCount} on map
              <ChevronRight size={15} />
            </span>
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void toggleVisibility()}
            className={`visibility-button ${visible ? "is-visible" : ""}`}
            aria-label={visible ? "Visible" : "Hidden"}
            aria-pressed={visible}
          >
            {visible ? <Eye size={19} /> : <EyeOff size={19} />}
            <span>{visible ? "Visible" : "Hidden"}</span>
          </button>
        </div>
        {demoMode && (
          <p className="app-preview-note">Preview · this browser only</p>
        )}
        {(error || syncError) && (
          <p role="alert" className="error-note compact-note">
            {error || syncError}
          </p>
        )}
        {shareStatus && (
          <p role="status" className="info-note compact-note break-words">
            {shareStatus}
          </p>
        )}
      </header>
      <main
        id="event-content"
        className={`event-content ${view === "map" ? "map-content" : ""}`}
      >
        {view === "people" ? (
          <AttendeeList
            attendees={attendees}
            onSelect={selectAttendee}
            onShare={() => void shareEvent()}
          />
        ) : (
          <div className="map-stage">
            <AttendeeMap
              venue={{
                lat: event.venueLat,
                lng: event.venueLng,
                name: event.venueName,
              }}
              attendees={attendees}
              selectedId={selected?.membershipId ?? null}
              onSelectAttendee={selectAttendee}
              onSelectEvent={() => setEventOpen(true)}
            />
            <p className="map-disclaimer">
              Venue-based markers · no GPS collected
            </p>
          </div>
        )}
      </main>
      <nav className="bottom-dock" aria-label="Event navigation">
        <button
          type="button"
          className={`dock-item ${view === "people" ? "active" : ""}`}
          aria-current={view === "people" ? "page" : undefined}
          onClick={() => setView("people")}
        >
          <UsersRound size={21} />
          <span>People</span>
        </button>
        <button
          type="button"
          className={`dock-item ${view === "map" ? "active" : ""}`}
          aria-current={view === "map" ? "page" : undefined}
          onClick={() => setView("map")}
        >
          <MapIcon size={21} />
          <span>Map</span>
        </button>
        <AskGrokPanel
          onAsk={askGrok}
          profile={matchProfile}
          visible={visible}
          slug={slug}
          connections={connections}
          connectionError={connectionError}
          onSaveProfile={saveMatchProfile}
          onRequest={requestIntroduction}
          onUpdate={updateIntroduction}
          attendeeIds={attendees
            .filter((a) => !a.isSelf)
            .map((a) => a.membershipId)}
          onSelect={(id) => {
            const person = attendees.find((a) => a.membershipId === id);
            if (person) selectAttendee(person);
          }}
        />
      </nav>
      <ProfileSheet
        attendee={currentAttendee}
        eventName={event.name}
        open={profileOpen && !!currentAttendee}
        onOpenChange={setProfileOpen}
      />
      <EventInfoSheet
        event={event}
        open={eventOpen}
        onOpenChange={setEventOpen}
      />
    </div>
  );
}
