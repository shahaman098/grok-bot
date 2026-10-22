import type { User } from "@supabase/supabase-js";
export type LinkedInIdentity = {
  displayName: string;
  avatarUrl: string | null;
};
export function normalizeLinkedInPhoto(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 2048) return null;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.port ||
      !(
        host === "licdn.com" ||
        host.endsWith(".licdn.com") ||
        host === "licdn-ei.com" ||
        host.endsWith(".licdn-ei.com")
      )
    )
      return null;
    return url.href;
  } catch {
    return null;
  }
}
function text(value: unknown): string {
  return typeof value === "string" ? value.trim().slice(0, 80) : "";
}
/** Only an authenticated provider identity qualifies; editable app metadata alone does not. */
export function linkedInIdentity(
  user: Pick<User, "identities">,
): LinkedInIdentity | null {
  const identity = user.identities?.find((i) => i.provider === "linkedin_oidc");
  if (!identity) return null;
  const data = identity.identity_data ?? {};
  const displayName =
    text(data.name) ||
    text(data.full_name) ||
    [text(data.given_name), text(data.family_name)]
      .filter(Boolean)
      .join(" ")
      .slice(0, 80) ||
    "LinkedIn member";
  return {
    displayName,
    avatarUrl:
      normalizeLinkedInPhoto(data.picture) ??
      normalizeLinkedInPhoto(data.avatar_url),
  };
}
