import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@supabase/supabase-js", () => ({ createClient: () => ({ rpc }) }));
import { POST } from "@/app/api/mcp/route";

const token = "a".repeat(64);
const clients: Client[] = [];
async function client(authorization?: string) {
  const c = new Client({ name: "connector-test", version: "1" });
  clients.push(c);
  await c.connect(new StreamableHTTPClientTransport(new URL("https://bumpin.test/api/mcp"), {
    requestInit: { headers: authorization ? { Authorization: authorization } : {} },
    fetch: (input, init) => POST(new Request(input, init)),
  }));
  return c;
}
beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "test-key");
  rpc.mockReset();
});
afterEach(async () => { await Promise.all(clients.splice(0).map((c) => c.close())); vi.unstubAllEnvs(); });

describe("BumpIn MCP interoperability", () => {
  it("discovers four read-only tools and calls public event details without database access", async () => {
    const c = await client();
    const tools = await c.listTools();
    expect(tools.tools.map((t) => t.name).sort()).toEqual(["find_my_collaborators", "find_people", "get_approved_introduction", "get_event"]);
    expect(tools.tools.every((t) => t.annotations?.readOnlyHint)).toBe(true);
    const event = await c.callTool({ name: "get_event", arguments: {} });
    expect(event.structuredContent).toMatchObject({ slug: "grok-bot-london" });
    expect(rpc).not.toHaveBeenCalled();
  });
  it("denies private tools without a scoped token and rejects a Supabase token", async () => {
    for (const authorization of [undefined, "Bearer eyJ.test.supabase"]) {
      const c = await client(authorization);
      const response = await c.callTool({ name: "find_people", arguments: { query: "design" } });
      expect(response.isError).toBe(true);
    }
    expect(rpc).not.toHaveBeenCalled();
  });
  it("uses token-scoped current profiles and excludes contact links and coordinates", async () => {
    rpc.mockResolvedValue({ data: { eventSlug: "grok-bot-london", attendees: [
      { membershipId: "self", displayName: "You", building: "Maps", canHelpWith: "TypeScript", lookingFor: "design", isSelf: true },
      { membershipId: "designer", displayName: "Designer", building: "design tools", canHelpWith: "design", lookingFor: "TypeScript", isSelf: false,
        linkedinUrl: "https://private.invalid", user_id: "private-id", displayLat: 51.5 },
    ] }, error: null });
    const c = await client(`Bearer ${token}`);
    const result = await c.callTool({ name: "find_people", arguments: { query: "design" } });
    expect(result.isError).not.toBe(true);
    expect(rpc).toHaveBeenCalledWith("read_bot_context", { p_token: token });
    expect(result.structuredContent).toMatchObject({ matches: [{ membershipId: "designer" }] });
    expect(JSON.stringify(result)).not.toMatch(/private-id|private.invalid|displayLat/);
    const matches = await c.callTool({ name: "find_my_collaborators", arguments: {} });
    expect(matches.structuredContent).toMatchObject({ matches: [{ membershipId: "designer" }] });
  });
  it("fails closed on revoked credentials and stage lookup failures", async () => {
    rpc.mockResolvedValue({ data: null, error: { code: "42501" } });
    const c = await client(`Bearer ${token}`);
    expect((await c.callTool({ name: "find_people", arguments: { query: "design" } })).isError).toBe(true);
    expect((await c.callTool({ name: "get_approved_introduction", arguments: { connectionId: "00000000-0000-4000-8000-000000000001" } })).isError).toBe(true);
    rpc.mockResolvedValue({ data: null, error: null });
    const empty = await c.callTool({ name: "get_approved_introduction", arguments: { connectionId: "00000000-0000-4000-8000-000000000001" } });
    expect(empty.structuredContent).toMatchObject({ snapshot: null });
  });
  it("rejects untrusted browser origins before protocol or database access", async () => {
    const response = await POST(new Request("https://bumpin.test/api/mcp", { method: "POST", headers: { Origin: "https://elsewhere.test" } }));
    expect(response.status).toBe(403);
    expect(rpc).not.toHaveBeenCalled();
  });
});
