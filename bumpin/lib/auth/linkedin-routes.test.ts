import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
const { exchange, oauth, entry } = vi.hoisted(() => ({
  exchange: vi.fn(),
  oauth: vi.fn(),
  entry: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { exchangeCodeForSession: exchange, signInWithOAuth: oauth },
  })),
}));
vi.mock("@/lib/auth/linkedin-entry", () => ({ completeLinkedInEntry: entry }));
import { GET as callback } from "@/app/auth/callback/route";
import {
  GET as availability,
  POST as start,
} from "@/app/api/auth/linkedin/route";
import {
  createJoinIntent,
  JOIN_INTENT_COOKIE,
} from "@/lib/auth/linkedin-intent";
beforeEach(() => {
  vi.clearAllMocks();
  exchange.mockResolvedValue({ error: null });
  oauth.mockResolvedValue({
    data: { url: "https://auth.example.test/auth/v1/authorize" },
    error: null,
  });
  entry.mockResolvedValue(undefined);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
describe("LinkedIn auth boundaries", () => {
  it("exchanges PKCE codes and restricts redirects to the event on the actual request host", async () => {
    const response = await callback(
      new Request(
        "http://localhost:3000/auth/callback?code=test-code&eventSlug=https://evil.test",
        { headers: { host: "127.0.0.1:3000" } },
      ),
    );
    expect(exchange).toHaveBeenCalledWith("test-code");
    expect(response.headers.get("location")).toBe(
      "http://127.0.0.1:3000/e/grok-bot-london",
    );
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(entry).not.toHaveBeenCalled();
  });
  it("requires explicit same-origin sharing intent before starting OAuth", async () => {
    const request = (body: unknown, origin = "https://bumpin.test") =>
      new Request("https://bumpin.test/api/auth/linkedin", {
        method: "POST",
        headers: { "content-type": "application/json", origin },
        body: JSON.stringify(body),
      });
    expect(
      (
        await start(
          request(
            { eventSlug: "grok-bot-london", shareProfile: true },
            "https://evil.test",
          ),
        )
      ).status,
    ).toBe(403);
    expect(
      (await start(request({ eventSlug: "grok-bot-london" }))).status,
    ).toBe(400);
    expect(
      (await start(request({ eventSlug: "other", shareProfile: true }))).status,
    ).toBe(400);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://auth.example.test");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json({ external: { linkedin_oidc: true } }),
        ),
    );
    const response = await start(
      request({ eventSlug: "grok-bot-london", shareProfile: true }),
    );
    expect(response.status).toBe(200);
    const cookie = response.cookies.get(JOIN_INTENT_COOKIE);
    expect(cookie).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      maxAge: 600,
      path: "/auth/callback",
    });
    const redirectTo = new URL(oauth.mock.calls[0][0].options.redirectTo);
    expect(redirectTo.origin).toBe("https://bumpin.test");
    expect(redirectTo.searchParams.get("eventSlug")).toBe("grok-bot-london");
    expect(
      JSON.parse(Buffer.from(cookie!.value, "base64url").toString()).nonce,
    ).toBe(redirectTo.searchParams.get("joinIntent"));
  });
  it("completes entry only for a matching intent and consumes it on every outcome", async () => {
    const intent = createJoinIntent("grok-bot-london");
    const request = () =>
      new Request(
        `https://bumpin.test/auth/callback?code=code&eventSlug=grok-bot-london&joinIntent=${intent.nonce}`,
        { headers: { cookie: `${JOIN_INTENT_COOKIE}=${intent.value}` } },
      );
    const response = await callback(request());
    expect(entry).toHaveBeenCalledWith(expect.anything(), "grok-bot-london");
    expect(response.headers.get("location")).toBe(
      "https://bumpin.test/e/grok-bot-london",
    );
    expect(response.cookies.get(JOIN_INTENT_COOKIE)?.maxAge).toBe(0);
    entry.mockRejectedValueOnce(new Error("private-db-detail"));
    const failed = await callback(request());
    expect(failed.headers.get("location")).toBe(
      "https://bumpin.test/e/grok-bot-london?signin=join-failed",
    );
    entry.mockClear();
    const missing = await callback(
      new Request(
        `https://bumpin.test/auth/callback?code=code&joinIntent=${intent.nonce}`,
      ),
    );
    expect(entry).not.toHaveBeenCalled();
    expect(missing.headers.get("location")).toContain("signin=join-failed");
    expect(missing.cookies.get(JOIN_INTENT_COOKIE)?.maxAge).toBe(0);
  });
  it("handles cancellation and failed exchanges without echoing provider errors", async () => {
    const cancelled = await callback(
      new Request(
        "https://bumpin.test/auth/callback?error=access_denied&error_description=private-secret",
      ),
    );
    expect(cancelled.headers.get("location")).toBe(
      "https://bumpin.test/e/grok-bot-london?signin=cancelled",
    );
    expect(exchange).not.toHaveBeenCalled();
    exchange.mockResolvedValue({ error: { message: "private-secret" } });
    const failed = await callback(
      new Request("https://bumpin.test/auth/callback?code=bad"),
    );
    expect(failed.headers.get("location")).toBe(
      "https://bumpin.test/e/grok-bot-london?signin=failed",
    );
  });
  it("sets no intent when LinkedIn is disabled or authorization cannot start", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://auth.example.test");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "test-key");
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    const request = () =>
      new Request("https://bumpin.test/api/auth/linkedin", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "https://bumpin.test",
        },
        body: JSON.stringify({
          eventSlug: "grok-bot-london",
          shareProfile: true,
        }),
      });
    fetcher.mockResolvedValueOnce(
      Response.json({ external: { linkedin_oidc: false } }),
    );
    const disabled = await start(request());
    expect(disabled.status).toBe(503);
    expect(disabled.cookies.get(JOIN_INTENT_COOKIE)).toBeUndefined();
    expect(oauth).not.toHaveBeenCalled();
    fetcher.mockResolvedValueOnce(
      Response.json({ external: { linkedin_oidc: true } }),
    );
    oauth.mockResolvedValueOnce({
      data: { url: null },
      error: { message: "private-provider-detail" },
    });
    const failed = await start(request());
    expect(failed.status).toBe(503);
    expect(failed.cookies.get(JOIN_INTENT_COOKIE)).toBeUndefined();
    expect(JSON.stringify(await failed.json())).not.toContain(
      "private-provider-detail",
    );
  });
  it("reports provider-disabled and enabled accurately, and fails closed on settings outages", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://auth.example.test");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "test-key");
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    fetcher.mockResolvedValueOnce(
      Response.json({ external: { linkedin_oidc: false } }),
    );
    expect(await (await availability()).json()).toEqual({ enabled: false });
    fetcher.mockResolvedValueOnce(
      Response.json({ external: { linkedin_oidc: true } }),
    );
    expect(await (await availability()).json()).toEqual({ enabled: true });
    fetcher.mockRejectedValueOnce(new Error("private-settings-error"));
    const failed = await availability();
    expect(failed.status).toBe(503);
    expect(await failed.json()).toEqual({ enabled: false });
  });
});
