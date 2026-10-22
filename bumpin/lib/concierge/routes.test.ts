import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  context: vi.fn(),
  quota: vi.fn(),
  attendees: vi.fn(),
  semantic: vi.fn(),
  access: vi.fn(),
  requireAccess: vi.fn(),
}));
vi.mock("./access", () => ({ conciergeAccess: mocks.access, requireConciergeAccess: mocks.requireAccess }));
vi.mock("./server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./server")>()),
  eventContext: mocks.context,
  claimQuota: mocks.quota,
  publicAttendees: mocks.attendees,
}));
vi.mock("./matching", () => ({ semanticMatches: mocks.semantic }));
import { POST as session } from "@/app/api/concierge/session/route";
import { POST as search } from "@/app/api/concierge/search/route";
import { ConciergeError } from "./server";
import { POST as requestAccess } from "@/app/api/concierge/access/route";
import { GET as config } from "@/app/api/concierge/config/route";

const person = {
  membershipId: "ada",
  displayName: "Ada",
  avatarSeed: "ada",
  linkedinUrl: null,
  building: "Audio agents",
  canHelpWith: "Speech recognition",
  lookingFor: "Design",
  displayLat: 51.5,
  displayLng: -0.2,
};
const match = {
  membershipId: "ada",
  evidence: [{ theirExcerpt: "Speech recognition" }],
};
const request = (body: unknown, origin = "http://localhost") =>
  new Request("http://localhost/api/concierge/session", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("BUMPIN_CONCIERGE_ENABLED", "true");
  vi.stubEnv("XAI_API_KEY", "provider-test-key");
  mocks.context.mockResolvedValue({ eventSlug: "test" });
  mocks.quota.mockResolvedValue(undefined);
  mocks.attendees.mockResolvedValue([person]);
  mocks.semantic.mockResolvedValue([match]);
  mocks.access.mockResolvedValue("approved");
  mocks.requireAccess.mockResolvedValue(undefined);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("concierge routes", () => {
  it("requires owner approval before minting tokens or using paid matching", async () => {
    mocks.requireAccess.mockRejectedValue(new ConciergeError("Request access", 403));
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    expect((await session(request({ eventSlug: "test" }))).status).toBe(403);
    const result = await search(request({ eventSlug: "test", query: "Speech" }));
    expect(await result.json()).toMatchObject({ source: "rules", fallbackReason: expect.stringContaining("Request access") });
    expect(mocks.semantic).not.toHaveBeenCalled();
    expect(mocks.quota).not.toHaveBeenCalled();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("reports caller-specific access and only saves a pending request", async () => {
    mocks.access.mockResolvedValue("pending");
    expect(await (await config(new Request("http://localhost/api/concierge/config?eventSlug=test"))).json())
      .toEqual({ voiceEnabled: false, access: "pending" });
    expect(await (await requestAccess(request({ eventSlug: "test" }))).json()).toEqual({ access: "pending" });
    expect(mocks.access).toHaveBeenLastCalledWith({ eventSlug: "test" }, true);
    expect((await requestAccess(request({ eventSlug: "test", status: "approved" }))).status).toBe(400);
    expect(mocks.quota).not.toHaveBeenCalled();
  });
  it("rejects cross-origin calls before authentication/provider use", async () => {
    expect(
      (await session(request({ eventSlug: "test" }, "https://elsewhere.test")))
        .status,
    ).toBe(403);
    expect(mocks.context).not.toHaveBeenCalled();
  });
  it("does not mint credentials for unauthenticated/non-member callers", async () => {
    mocks.context.mockRejectedValue(new ConciergeError("Join first", 401));
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    expect((await session(request({ eventSlug: "test" }))).status).toBe(401);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("limits issuance before contacting the provider", async () => {
    mocks.quota.mockRejectedValue(new ConciergeError("Limit reached", 429));
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    expect((await session(request({ eventSlug: "test" }))).status).toBe(429);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("returns only ephemeral credentials, never the long-lived API key", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        Response.json({ value: "temporary-test-secret", expires_at: 12345 }),
      );
    vi.stubGlobal("fetch", fetcher);
    const response = await session(request({ eventSlug: "test" }));
    const body = await response.json();
    expect(body.token).toBe("temporary-test-secret");
    expect(JSON.stringify(body)).not.toContain("provider-test-key");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({
      expires_after: { seconds: 60 },
    });
  });
  it("removes a match hidden while the AI lookup was running", async () => {
    mocks.attendees.mockResolvedValueOnce([person]).mockResolvedValueOnce([]);
    const response = await search(
      request({ eventSlug: "test", query: "speech" }),
    );
    expect(await response.json()).toEqual({ matches: [], source: "grok" });
  });
  it("preserves no-match output and labels provider failure fallbacks", async () => {
    mocks.semantic.mockResolvedValueOnce([]);
    expect(
      await (
        await search(request({ eventSlug: "test", query: "quantum optics" }))
      ).json(),
    ).toEqual({ matches: [], source: "grok" });
    mocks.semantic.mockRejectedValueOnce(new Error("Provider unavailable"));
    expect(
      await (
        await search(request({ eventSlug: "test", query: "Speech" }))
      ).json(),
    ).toMatchObject({
      source: "rules",
      fallbackReason: expect.any(String),
      matches: [{ membershipId: "ada" }],
    });
  });
  it("supports typed matching with AI disabled and rejects oversized input", async () => {
    vi.stubEnv("BUMPIN_CONCIERGE_ENABLED", "false");
    expect(
      await (
        await search(request({ eventSlug: "test", query: "Speech" }))
      ).json(),
    ).toMatchObject({ source: "rules" });
    expect(mocks.semantic).not.toHaveBeenCalled();
    expect(
      (await search(request({ eventSlug: "test", query: "a".repeat(301) })))
        .status,
    ).toBe(400);
  });
});
