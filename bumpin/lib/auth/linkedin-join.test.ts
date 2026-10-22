import { beforeEach, describe, expect, it, vi } from "vitest";

const { getUser, profileWrite, membershipWrite, from } = vi.hoisted(() => ({
  getUser: vi.fn(),
  profileWrite: vi.fn(),
  membershipWrite: vi.fn(),
  from: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ auth: { getUser }, from })),
}));
import { POST } from "@/app/api/join/route";
import { GET as me } from "@/app/api/me/route";

const request = (overrides: Record<string, unknown> = {}) =>
  new Request("https://bumpin.test/api/join", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      eventSlug: "grok-bot-london",
      displayName: "Client name",
      avatarSeed: "seed",
      visible: false,
      locationConsent: false,
      avatarUrl: "https://attacker.test/photo",
      skills: "Not a real claim",
      ...overrides,
    }),
  });
beforeEach(() => {
  vi.clearAllMocks();
  profileWrite.mockResolvedValue({ error: null });
  membershipWrite.mockResolvedValue({ error: null });
  const query = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: { id: "event", venue_lat: 51.5, venue_lng: -0.1 },
      error: null,
    }),
  };
  from.mockImplementation((table: string) =>
    table === "events"
      ? query
      : {
          upsert: table === "profiles" ? profileWrite : membershipWrite,
        },
  );
});
describe("LinkedIn join provenance", () => {
  it("appears on the venue map automatically when join visibility is omitted", async () => {
    getUser.mockResolvedValue({
      data: { user: { id: "guest-id", identities: [] } },
    });
    expect((await POST(request({ visible: undefined }))).status).toBe(200);
    expect(membershipWrite).toHaveBeenCalledWith(
      expect.objectContaining({
        visible: true,
        location_consent: false,
        display_lat: expect.any(Number),
        display_lng: expect.any(Number),
      }),
    );
  });
  it("restores the saved own link for entry retries without exposing private auth claims", async () => {
    getUser.mockResolvedValue({
      data: {
        user: {
          id: "private-id",
          identities: [],
          email: "private@example.test",
        },
      },
    });
    from.mockImplementation((table: string) => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        error: null,
        data:
          table === "events"
            ? { id: "event" }
            : table === "event_memberships"
              ? null
              : {
                  display_name: "Saved name",
                  avatar_seed: "saved",
                  avatar_url: null,
                  linkedin_url: "https://www.linkedin.com/in/saved",
                  building: "A project",
                  can_help_with: "Design",
                  looking_for: "Development",
                },
      }),
    }));
    const response = await me(
      new Request("https://bumpin.test/api/me?eventSlug=grok-bot-london"),
    );
    const value = await response.json();
    expect(response.status).toBe(200);
    expect(value.profile.linkedinUrl).toBe("https://www.linkedin.com/in/saved");
    expect(value.profile.canHelpWith).toBe("Design");
    expect(value.identity).toBeNull();
    expect(JSON.stringify(value)).not.toContain("private-id");
    expect(JSON.stringify(value)).not.toContain("private@example.test");
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
  it("writes only server-authenticated identity name/photo and keeps visibility opt-in", async () => {
    getUser.mockResolvedValue({
      data: {
        user: {
          id: "private-id",
          identities: [
            {
              provider: "linkedin_oidc",
              identity_data: {
                name: "Provider name",
                picture: "https://media.licdn.com/photo",
                email: "private@example.test",
              },
            },
          ],
        },
      },
    });
    expect((await POST(request())).status).toBe(200);
    expect(profileWrite).toHaveBeenCalledWith({
      id: "private-id",
      display_name: "Provider name",
      avatar_url: "https://media.licdn.com/photo",
      linkedin_url: null,
      avatar_seed: "seed",
      building: null,
      can_help_with: null,
      looking_for: null,
    });
    expect(membershipWrite).toHaveBeenCalledWith(
      expect.objectContaining({
        visible: false,
        display_lat: null,
        display_lng: null,
      }),
    );
  });
  it("ignores client photos for guest identities and requires authentication", async () => {
    getUser.mockResolvedValueOnce({
      data: { user: { id: "guest-id", identities: [] } },
    });
    expect((await POST(request())).status).toBe(200);
    expect(profileWrite).toHaveBeenCalledWith(
      expect.objectContaining({
        display_name: "Client name",
        avatar_url: null,
      }),
    );
    profileWrite.mockClear();
    getUser.mockResolvedValueOnce({ data: { user: null } });
    expect((await POST(request())).status).toBe(401);
    expect(profileWrite).not.toHaveBeenCalled();
  });
});
