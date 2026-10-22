import { beforeEach, expect, it, vi } from "vitest";
const { rpc, authenticatedClient } = vi.hoisted(() => ({ rpc: vi.fn(), authenticatedClient: vi.fn() }));
vi.mock("@/lib/connections/api", async () => ({
  ...await vi.importActual<typeof import("@/lib/connections/api")>("@/lib/connections/api"), authenticatedClient,
}));
import { POST, DELETE } from "@/app/api/bot-access/route";
function request(body: unknown, method = "POST", origin = "https://bumpin.test") {
  return new Request("https://bumpin.test/api/bot-access", { method, headers: { "content-type": "application/json", origin }, body: JSON.stringify(body) });
}
beforeEach(() => { rpc.mockReset(); authenticatedClient.mockReset(); authenticatedClient.mockResolvedValue({ rpc }); });
it("requires explicit consent and a signed-in attendee", async () => {
  expect((await POST(request({ eventSlug: "event" }))).status).toBe(400);
  expect(authenticatedClient).not.toHaveBeenCalled();
  authenticatedClient.mockResolvedValue(null);
  expect((await POST(request({ eventSlug: "event", consent: true }))).status).toBe(401);
  expect(rpc).not.toHaveBeenCalled();
});
it("creates and revokes only the authenticated caller's event scope with no caching", async () => {
  rpc.mockResolvedValue({ data: { token: "scoped", expiresAt: "later" }, error: null });
  const response = await POST(request({ eventSlug: "event", consent: true }));
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(rpc).toHaveBeenCalledWith("create_bot_access", { p_event_slug: "event" });
  expect((await DELETE(request({ eventSlug: "event" }, "DELETE"))).status).toBe(200);
  expect(rpc).toHaveBeenCalledWith("revoke_bot_access", { p_event_slug: "event" });
});
it("blocks cross-origin requests and reports hidden membership", async () => {
  expect((await POST(request({ eventSlug: "event", consent: true }, "POST", "https://evil.test"))).status).toBe(403);
  rpc.mockResolvedValue({ data: null, error: { code: "42501" } });
  expect((await POST(request({ eventSlug: "event", consent: true }))).status).toBe(403);
});
