"use client";

import Link from "next/link";
import { ArrowLeft, Check, Copy } from "lucide-react";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { Brand } from "@/components/ui/brand";
import { GROK_BOT_LONDON } from "@/lib/events/seed";
import { BotRequestError, requestBotJson } from "@/lib/bot/request";

const PUBLIC_ORIGIN = "https://bumpin-silk.vercel.app";
const subscribeNever = () => () => {};
type MembershipState = "checking" | "join" | "hidden" | "ready" | "unavailable";
// A localhost endpoint is unreachable for Grok Bot, so keep the public one there.
const currentOrigin = () =>
  /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])/.test(window.location.origin)
    ? PUBLIC_ORIGIN
    : window.location.origin;

export default function GrokConnectionPage() {
  const [connection, setConnection] = useState<{ token: string; expiresAt: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [membership, setMembership] = useState<MembershipState>("checking");
  const [makingVisible, setMakingVisible] = useState(false);
  const origin = useSyncExternalStore(subscribeNever, currentOrigin, () => PUBLIC_ORIGIN);
  const endpoint = `${origin}/api/mcp`;
  const eventUrl = `/e/${GROK_BOT_LONDON.slug}`;
  const checkMembership = useCallback(async () => {
    try {
      const data = await requestBotJson<{ membership: { visible: boolean } | null }>(
        `/api/me?eventSlug=${GROK_BOT_LONDON.slug}`,
      );
      return data.membership ? (data.membership.visible ? "ready" : "hidden") : "join";
    } catch (error) {
      return error instanceof BotRequestError && error.status === 401 ? "join" : "unavailable";
    }
  }, []);
  useEffect(() => {
    let active = true;
    void checkMembership().then((state) => { if (active) setMembership(state); });
    return () => { active = false; };
  }, [checkMembership]);
  async function retryMembership() {
    setMembership("checking");
    setMembership(await checkMembership());
  }
  async function becomeVisible() {
    setMakingVisible(true); setMessage(""); setFailed(false);
    try {
      await requestBotJson("/api/me", { method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventSlug: GROK_BOT_LONDON.slug, visible: true }),
      });
      // Verify membership rather than treating an HTTP acknowledgement as visibility.
      setMembership(await checkMembership());
    } catch (error) {
      if (error instanceof BotRequestError && [401, 404].includes(error.status)) setMembership("join");
      setFailed(true); setMessage(error instanceof Error ? error.message : "Please retry.");
    } finally { setMakingVisible(false); }
  }
  async function update(method: "POST" | "DELETE") {
    setBusy(true); setMessage(""); setCopied(false); setFailed(false);
    try {
      const data = await requestBotJson<{ token: string; expiresAt: string }>("/api/bot-access", { method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventSlug: GROK_BOT_LONDON.slug, ...(method === "POST" ? { consent: true } : {}) }),
      });
      setConnection(method === "POST" ? data : null);
      setMessage(method === "POST" ? "Your read-only connection is ready. Add it to Grok Bot below." : "Attendee access revoked. Public event tools remain available.");
    } catch (error) {
      if (error instanceof BotRequestError && error.status === 401) {
        setMembership("join"); setConnection(null);
      }
      if (error instanceof BotRequestError && error.status === 403) {
        setMembership(await checkMembership());
        setConnection(null);
      }
      setFailed(true);
      setMessage(error instanceof Error ? error.message : "Please retry.");
    }
    finally { setBusy(false); }
  }
  async function copyHeader() {
    if (!connection) return;
    try { await navigator.clipboard.writeText(`Bearer ${connection.token}`); setCopied(true); }
    catch { setFailed(true); setMessage("Could not copy. Select the credential below instead."); }
  }
  return (
    <main className="connect-page">
      <header className="connect-top">
        <Brand />
        <Link href={`/e/${GROK_BOT_LONDON.slug}`} className="connect-back">
          <ArrowLeft size={16} /> Back to the event
        </Link>
      </header>
      <div>
        <p className="eyebrow">BUMPIN × GROK BOT</p>
        <h1 className="connect-title">Bring your Bot to the room.</h1>
        <p className="muted">Ask your Grok Bot to find people worth meeting and explain the profile evidence behind each suggestion.</p>
      </div>
      <section className="connect-card">
        <h2>1 · Connect the public tools</h2>
        <p className="muted">Send this to your Bot:</p>
        <pre className="connect-code">Add a custom MCP server named BumpIn at {endpoint}. Call get_event to verify it.</pre>
        <p className="muted">This gives your Bot event details and access to individual stage previews that both people have approved.</p>
      </section>
      <section className="connect-card">
        <h2>2 · Let your Bot find collaborators</h2>
        <p className="muted">Creating access lets Grok Bot read your profile and the currently visible attendees’ names, projects, offers and needs for this event. Grok Bot processes that information under its own terms. Contact links, locations and private introductions are excluded.</p>
        <p className="muted">Access lasts one hour. Creating a new connection replaces the previous one. You can revoke it here; hiding or leaving the event also revokes it. Information already read may remain in your Bot’s conversation.</p>
        {membership === "checking" && <p role="status" className="info-note">Checking your event access…</p>}
        {membership === "join" && <div className="info-note">
          <p>Join the event in this browser first. Your event sign-in stays with the browser where you joined.</p>
          <Link href={eventUrl} className="primary-button">Join the event</Link>
        </div>}
        {membership === "hidden" && <div className="info-note">
          <p>Your profile is hidden. Show it at this event before creating a Bot connection. This shares your profile with other attendees.</p>
          <button className="primary-button" disabled={makingVisible} onClick={() => void becomeVisible()}>
            {makingVisible ? "Showing your profile…" : "Show my profile at this event"}
          </button>
        </div>}
        {membership === "unavailable" && <div className="info-note">
          <p>We couldn’t check your event access. Check your connection, then try again.</p>
          <button className="secondary-button" onClick={() => void retryMembership()}>Check event access again</button>
        </div>}
        <button className="primary-button" disabled={busy || membership !== "ready"} onClick={() => void update("POST")}>
          {busy ? "Updating…" : "Allow read-only access for one hour"}
        </button>
        <button className="secondary-button" disabled={busy || membership !== "ready"} onClick={() => void update("DELETE")}>Revoke attendee access</button>
        <p role={failed ? "alert" : "status"} className={message ? (failed ? "error-note" : "info-note") : "sr-only"}>{message}</p>
        {connection && <>
          <p className="muted">Ask your Grok Bot to request a BumpIn token in a secure input box. Enter the token there without “Bearer”; keep it out of ordinary chat. The Bot can use the saved secret for authenticated BumpIn searches.</p>
          <p className="muted">For clients with header settings, use this <strong>Authorization</strong> value:</p>
          <code className="connect-code">Bearer {connection.token}</code>
          <button className="secondary-button" onClick={() => void copyHeader()}>
            {copied ? <Check size={18} /> : <Copy size={18} />}
            {copied ? "Copied" : "Copy Authorization value"}
          </button>
          <p className="muted">Expires {new Date(connection.expiresAt).toLocaleTimeString("en-GB", { timeZone: "Europe/London", hour: "2-digit", minute: "2-digit" })} London time.</p>
          <p className="muted">Then ask: “Using BumpIn, find my best collaborators and draft a short opener for each.” Your Bot can suggest introductions; you send and accept them in BumpIn.</p>
        </>}
      </section>
    </main>
  );
}
