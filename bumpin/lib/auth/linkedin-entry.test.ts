import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { completeLinkedInEntry } from "@/lib/auth/linkedin-entry";
const getUser = vi.fn(),
  from = vi.fn(),
  profileWrite = vi.fn(),
  membershipWrite = vi.fn();
const client = { auth: { getUser }, from } as unknown as SupabaseClient;
beforeEach(() => {
  vi.clearAllMocks();
  getUser.mockResolvedValue({
    data: {
      user: {
        id: "user",
        identities: [
          {
            provider: "linkedin_oidc",
            identity_data: {
              name: "Ada",
              picture: "https://media.licdn.com/photo",
            },
          },
        ],
      },
    },
    error: null,
  });
  profileWrite.mockResolvedValue({ error: null });
  membershipWrite.mockResolvedValue({ error: null });
  const event = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi
      .fn()
      .mockResolvedValue({
        data: { id: "event", venue_lat: 51.5, venue_lng: -0.1 },
        error: null,
      }),
  };
  const profile = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi
      .fn()
      .mockResolvedValue({ data: { avatar_seed: "saved" }, error: null }),
    upsert: profileWrite,
  };
  from.mockImplementation((table: string) =>
    table === "events"
      ? event
      : table === "profiles"
        ? profile
        : { upsert: membershipWrite },
  );
});
describe("automatic LinkedIn entry", () => {
  it("imports authenticated identity without overwriting saved goals or existing hidden membership", async () => {
    await completeLinkedInEntry(client, "grok-bot-london");
    expect(profileWrite).toHaveBeenCalledWith({
      id: "user",
      display_name: "Ada",
      avatar_url: "https://media.licdn.com/photo",
      avatar_seed: "saved",
    });
    expect(membershipWrite).toHaveBeenCalledWith(
      expect.objectContaining({
        visible: true,
        location_consent: false,
        event_id: "event",
        user_id: "user",
      }),
      { onConflict: "event_id,user_id", ignoreDuplicates: true },
    );
  });
  it("rejects non-LinkedIn identities before writing", async () => {
    getUser.mockResolvedValue({
      data: { user: { id: "guest", identities: [] } },
      error: null,
    });
    await expect(
      completeLinkedInEntry(client, "grok-bot-london"),
    ).rejects.toThrow("LinkedIn sign-in required");
    expect(profileWrite).not.toHaveBeenCalled();
    expect(membershipWrite).not.toHaveBeenCalled();
  });
  it("does not report successful entry after a failed profile or membership write", async () => {
    profileWrite.mockResolvedValueOnce({
      error: { message: "private-db-detail" },
    });
    await expect(
      completeLinkedInEntry(client, "grok-bot-london"),
    ).rejects.toThrow("Could not save profile");
    expect(membershipWrite).not.toHaveBeenCalled();
    membershipWrite.mockResolvedValueOnce({
      error: { message: "private-db-detail" },
    });
    await expect(
      completeLinkedInEntry(client, "grok-bot-london"),
    ).rejects.toThrow("Could not enter event");
  });
});
