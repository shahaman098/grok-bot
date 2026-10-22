import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.create }));
import {
  eventContext,
  claimQuota,
  publicAttendees,
  conciergeFailure,
} from "./server";

function fixture() {
  const event = {
    select: vi.fn(),
    eq: vi.fn(),
    single: vi.fn().mockResolvedValue({ data: { id: "event" }, error: null }),
  };
  event.select.mockReturnValue(event);
  event.eq.mockReturnValue(event);
  const membership = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi
      .fn()
      .mockResolvedValue({ data: { visible: true }, error: null }),
  };
  membership.select.mockReturnValue(membership);
  membership.eq.mockReturnValue(membership);
  const client = {
    auth: {
      getUser: vi
        .fn()
        .mockResolvedValue({ data: { user: { id: "caller" } }, error: null }),
    },
    from: vi.fn((table: string) => (table === "events" ? event : membership)),
    rpc: vi.fn(),
  };
  mocks.create.mockResolvedValue(client);
  return { client, event, membership };
}
beforeEach(() => vi.resetAllMocks());
describe("concierge event authorization", () => {
  it("checks authenticated identity and the caller's visible event membership", async () => {
    const f = fixture();
    await eventContext("grok-bot-london");
    expect(f.event.eq).toHaveBeenCalledWith("slug", "grok-bot-london");
    expect(f.membership.eq).toHaveBeenCalledWith("event_id", "event");
    expect(f.membership.eq).toHaveBeenCalledWith("user_id", "caller");
  });
  it("denies absent, hidden and failed membership checks", async () => {
    const f = fixture();
    for (const data of [null, { visible: false }]) {
      f.membership.maybeSingle.mockResolvedValueOnce({ data, error: null });
      await expect(eventContext("event")).rejects.toMatchObject({
        status: 403,
      });
    }
    f.membership.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: { message: "database details" },
    });
    await expect(eventContext("event")).rejects.toMatchObject({ status: 503 });
  });
  it("never loads profiles for an invalid session", async () => {
    const f = fixture();
    f.client.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });
    await expect(eventContext("event")).rejects.toMatchObject({ status: 401 });
    expect(f.client.from).not.toHaveBeenCalled();
  });
  it("filters self and missing public positions through the existing projection", async () => {
    const f = fixture();
    const context = await eventContext("event");
    const row = {
      membership_id: "ada",
      display_name: "Ada",
      linkedin_url: null,
      avatar_seed: "a",
      building: "Audio",
      looking_for: null,
      display_lat: 51,
      display_lng: 0,
      is_self: false,
    };
    f.client.rpc.mockResolvedValue({
      data: [row, { ...row, is_self: true }, { ...row, display_lat: null }],
      error: null,
    });
    expect(await publicAttendees(context)).toHaveLength(1);
    const directory = await publicAttendees(context, { includeSelf: true });
    expect(directory).toHaveLength(2);
    expect(directory.find((a) => a.isSelf)?.building).toBe("Audio");
    expect(f.client.rpc).toHaveBeenCalledWith("list_event_attendees", {
      p_event_slug: "event",
    });
  });
  it("fails closed on missing quota setup or exhausted quota", async () => {
    const f = fixture();
    const context = await eventContext("event");
    f.client.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: "missing function" },
    });
    await expect(claimQuota(context, "voice")).rejects.toMatchObject({
      status: 503,
    });
    f.client.rpc.mockResolvedValueOnce({ data: false, error: null });
    await expect(claimQuota(context, "voice")).rejects.toMatchObject({
      status: 429,
    });
    f.client.rpc.mockResolvedValueOnce({ data: true, error: null });
    await expect(claimQuota(context, "search")).resolves.toBeUndefined();
  });
  it("does not leak server exception details", async () => {
    const response = conciergeFailure(new Error("sensitive database details"));
    expect(response.status).toBe(503);
    expect(JSON.stringify(await response.json())).not.toContain("sensitive");
  });
});
