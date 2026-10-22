import { createClient } from "@/lib/supabase/client";

let pendingSession: Promise<{ error?: string }> | null = null;

/** Ensure a Supabase session exists (guest mint via /api/session if needed). */
export function ensureSession(): Promise<{ error?: string }> {
  if (!pendingSession) {
    pendingSession = startSession().finally(() => { pendingSession = null; });
  }
  return pendingSession;
}

async function startSession(): Promise<{ error?: string }> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  if (data.session) return {};

  const res = await fetch("/api/session", { method: "POST" });
  const json = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    error?: string;
  };

  if (!res.ok || !json.access_token || !json.refresh_token) {
    return { error: json.error ?? "Could not start session" };
  }

  const { error } = await supabase.auth.setSession({
    access_token: json.access_token,
    refresh_token: json.refresh_token,
  });

  if (error) return { error: error.message };
  return {};
}
