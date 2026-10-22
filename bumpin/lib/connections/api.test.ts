import { beforeEach, describe, expect, it, vi } from "vitest";
const { client } = vi.hoisted(() => ({
  client: { auth: { getUser: vi.fn() }, rpc: vi.fn() },
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => client),
}));
import { mutationGuard } from "@/lib/connections/api";
import { POST, GET } from "@/app/api/connections/route";
import { PATCH } from "@/app/api/connections/[id]/route";
import { GET as stage } from "@/app/api/stage/[slug]/[id]/route";
const id = "a2aa7020-b28f-4512-a427-118e31524a99";
const post = (
  body: unknown,
  headers: Record<string, string> = { "content-type": "application/json" },
) =>
  new Request("https://bumpin.test/api/connections", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
beforeEach(() => {
  vi.clearAllMocks();
  client.auth.getUser.mockResolvedValue({
    data: { user: { id: "private-auth-id" } },
    error: null,
  });
});
describe("introduction API boundaries", () => {
  it("accepts the actual Host behind Next hostname normalization", () => {
    const request = new Request("http://localhost:3109/api/connections", {
      method: "POST",
      headers: {
        host: "127.0.0.1:3109",
        origin: "http://127.0.0.1:3109",
        "content-type": "application/json",
      },
      body: "{}",
    });
    expect(mutationGuard(request)).toBeNull();
    const proxied = new Request("http://localhost/api/connections", {
      method: "POST",
      headers: {
        host: "bumpin.test",
        origin: "https://bumpin.test",
        "x-forwarded-proto": "https",
        "content-type": "application/json",
      },
      body: "{}",
    });
    expect(mutationGuard(proxied)).toBeNull();
  });

  it("rejects cross-origin or non-JSON mutations before making database calls", async () => {
    expect(
      (
        await POST(
          post(
            {},
            {
              "content-type": "application/json",
              origin: "https://other.test",
            },
          ),
        )
      ).status,
    ).toBe(403);
    expect(
      (await POST(post({}, { "content-type": "text/plain" }))).status,
    ).toBe(415);
    expect(client.rpc).not.toHaveBeenCalled();
  });
  it("rejects malformed requests and anonymous users", async () => {
    expect((await POST(post({}))).status).toBe(400);
    client.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });
    expect(
      (await POST(post({ eventSlug: "event", targetMembershipId: "target" })))
        .status,
    ).toBe(401);
    expect(client.rpc).not.toHaveBeenCalled();
  });
  it("does not create a connection without a visible caller and grounded match", async () => {
    client.rpc.mockResolvedValue({ data: [], error: null });
    expect(
      (await POST(post({ eventSlug: "event", targetMembershipId: "target" })))
        .status,
    ).toBe(403);
    expect(client.rpc).toHaveBeenCalledTimes(1);
  });
  it("reports database mutation failures without a false success response", async () => {
    client.rpc.mockResolvedValue({
      data: null,
      error: { code: "40001", message: "Preview changed; review it again" },
    });
    const response = await PATCH(
      new Request(`https://bumpin.test/api/connections/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "approveStage", expectedRevision: 1 }),
      }),
      { params: Promise.resolve({ id }) },
    );
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: "Preview changed; review it again",
    });
  });
  it("keeps public stage responses empty on consent or database failures", async () => {
    client.rpc.mockResolvedValueOnce({ data: null, error: null });
    const context = { params: Promise.resolve({ slug: "event", id }) };
    const response = await stage(new Request("https://bumpin.test"), context);
    expect(await response.json()).toEqual({ snapshot: null });
    expect(response.headers.get("cache-control")).toContain("no-store");
    client.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: "private database details" },
    });
    const failed = await stage(new Request("https://bumpin.test"), context);
    expect(failed.status).toBe(503);
    expect(JSON.stringify(await failed.json())).not.toContain(
      "private database details",
    );
  });
  it("does not expose backend errors while listing private requests", async () => {
    client.rpc.mockResolvedValue({
      data: null,
      error: { code: "XX000", message: "private database details" },
    });
    const response = await GET(
      new Request("https://bumpin.test/api/connections?eventSlug=event"),
    );
    expect(response.status).toBe(503);
    expect(JSON.stringify(await response.json())).not.toContain(
      "private database details",
    );
  });
});
