import { describe, expect, it, vi } from "vitest";
import { conciergeAccess, requireConciergeAccess } from "./access";
import type { eventContext } from "./server";

describe("paid concierge access", () => {
  it("fails closed for required, pending, revoked, missing and invalid states", async () => {
    const rpc = vi.fn();
    const context = { client: { rpc }, eventSlug: "event" } as unknown as Awaited<ReturnType<typeof eventContext>>;
    for (const data of ["required", "pending", "revoked", null, "true"]) {
      rpc.mockResolvedValue({ data, error: null });
      await expect(requireConciergeAccess(context)).rejects.toBeDefined();
    }
    rpc.mockResolvedValue({ data: "approved", error: { message: "Unavailable" } });
    await expect(requireConciergeAccess(context)).rejects.toMatchObject({ status: 503 });
    rpc.mockResolvedValue({ data: "approved", error: null });
    await expect(requireConciergeAccess(context)).resolves.toBeUndefined();
    expect(rpc).toHaveBeenLastCalledWith("concierge_access_status", { p_event_slug: "event" });
  });
  it("requests only the current authenticated membership without accepting approval fields", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: "pending", error: null });
    const context = { client: { rpc }, eventSlug: "event" } as unknown as Awaited<ReturnType<typeof eventContext>>;
    expect(await conciergeAccess(context, true)).toBe("pending");
    expect(rpc).toHaveBeenCalledWith("request_concierge_access", { p_event_slug: "event" });
  });
});
