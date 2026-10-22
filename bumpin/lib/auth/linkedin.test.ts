import { describe, expect, it } from "vitest";
import type { User } from "@supabase/supabase-js";
import { linkedInIdentity, normalizeLinkedInPhoto } from "@/lib/auth/linkedin";
function user(
  provider: string,
  data: Record<string, unknown>,
): Pick<User, "identities"> {
  return {
    identities: [
      {
        id: "provider-sub",
        identity_id: "identity",
        user_id: "private-user",
        provider,
        identity_data: data,
        created_at: "2026-10-22T18:00:00Z",
        updated_at: "2026-10-22T18:00:00Z",
        last_sign_in_at: "2026-10-22T18:00:00Z",
      },
    ],
  };
}
describe("LinkedIn identity import", () => {
  it("imports only identity name and a safe photo, never professional or private fields", () => {
    expect(
      linkedInIdentity(
        user("linkedin_oidc", {
          name: "Ada",
          picture: "https://media.licdn.com/dms/image/photo",
          email: "private@example.com",
          skills: "invented",
          headline: "ignored",
        }),
      ),
    ).toEqual({
      displayName: "Ada",
      avatarUrl: "https://media.licdn.com/dms/image/photo",
    });
  });
  it("requires an actual provider identity and handles absent claims without guessing skills", () => {
    expect(
      linkedInIdentity(
        user("email", {
          name: "Fake LinkedIn",
          picture: "https://media.licdn.com/photo",
        }),
      ),
    ).toBeNull();
    expect(linkedInIdentity(user("linkedin_oidc", {}))).toEqual({
      displayName: "LinkedIn member",
      avatarUrl: null,
    });
    expect(
      linkedInIdentity(
        user("linkedin_oidc", { given_name: "Ada", family_name: "Lovelace" }),
      )?.displayName,
    ).toBe("Ada Lovelace");
  });
  it("rejects unsafe, lookalike, credential-bearing and non-LinkedIn image URLs", () => {
    for (const photo of [
      "http://media.licdn.com/a",
      "javascript:alert(1)",
      "https://licdn.com.attacker.test/a",
      "https://localhost/a",
      "https://user:pass@media.licdn.com/a",
      "https://media.licdn.com:8443/a",
      "not a url",
      "x".repeat(2049),
    ])
      expect(normalizeLinkedInPhoto(photo)).toBeNull();
    expect(normalizeLinkedInPhoto("https://media.licdn-ei.com/a")).toBe(
      "https://media.licdn-ei.com/a",
    );
  });
});
