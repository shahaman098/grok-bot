import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ user: { id: "caller" } as { id: string } | null, joined: true, failed: false, patch: vi.fn(), owner: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({
  auth: { getUser: async () => ({ data: { user: state.user } }) },
  from: (table: string) => ({
    select: () => ({ eq: () => table === "events"
      ? { single: async () => ({ data: { id: "event", venue_lat: 51.5, venue_lng: 0 } }) }
      : { eq: () => ({ maybeSingle: async () => ({ data: state.joined ? { visible: false, location_consent: false } : null }) }) } }),
    update: (patch: unknown) => {
      if (table === "profiles") {
        state.patch(patch);
        return { eq: async (column: string, id: string) => { state.owner(column, id); return { error: state.failed ? { message: "Database failed" } : null }; } };
      }
      return { eq: () => ({ eq: async () => ({ error: null }) }) };
    },
  }),
}) }));
import { PATCH } from "@/app/api/me/route";
import { normalizeLinkedInUrl, patchMeSchema } from "@/lib/validation";
import { emptyProfessionalProfile } from "@/lib/professional-profile";
const request = (body: object, origin = "https://bumpin.test") => new Request("https://bumpin.test/api/me", {
  method: "PATCH", headers: { "Content-Type": "application/json", Origin: origin }, body: JSON.stringify({ eventSlug: "event", ...body }),
});
beforeEach(() => { vi.clearAllMocks(); state.user = { id: "caller" }; state.joined = true; state.failed = false; });
describe("shared LinkedIn link", () => {
  it("saves reviewed details only to the authenticated profile and preserves matching fields", async () => {
    const professionalProfile = { ...emptyProfessionalProfile, headline: " Engineer ", skills: "React" };
    expect((await PATCH(request({ professionalProfile, userId: "victim" }))).status).toBe(200);
    expect(state.patch).toHaveBeenCalledWith({ professional_profile: { ...professionalProfile, headline: "Engineer" } });
    expect(state.owner).toHaveBeenCalledWith("id", "caller");
  });
  it("rejects malformed or overlong professional sections before a write", async () => {
    for (const professionalProfile of [{ skills: "React" }, { ...emptyProfessionalProfile, headline: "a".repeat(241) }, { ...emptyProfessionalProfile, email: "private@example.com" }]) {
      expect((await PATCH(request({ professionalProfile }))).status).toBe(400);
    }
    expect(state.patch).not.toHaveBeenCalled();
  });
  it("clears imported details without clearing identity, links or event goals", async () => {
    expect((await PATCH(request({ professionalProfile: null }))).status).toBe(200);
    expect(state.patch).toHaveBeenCalledWith({ professional_profile: null });
  });
  it("rejects unauthenticated and non-member professional-profile saves", async () => {
    state.user = null;
    expect((await PATCH(request({ professionalProfile: emptyProfessionalProfile }))).status).toBe(401);
    state.user = { id: "caller" }; state.joined = false;
    expect((await PATCH(request({ professionalProfile: null }))).status).toBe(404);
    expect(state.patch).not.toHaveBeenCalled();
  });
  it("normalizes a member link and strips tracking and fragments", () => {
    expect(normalizeLinkedInUrl("linkedin.com/in/example?trk=example#about")).toBe("https://www.linkedin.com/in/example");
    expect(patchMeSchema.parse({ eventSlug: "event", linkedinUrl: "" }).linkedinUrl).toBe("");
  });
  it.each(["javascript:alert(1)", "https://linkedin.com.evil.test/in/a", "https://linkedin.com/company/a", "https://linkedin.com/oauth/v2/authorization", "https://person:secret@linkedin.com/in/a", "http://linkedin.com/in/a", "https://linkedin.com:444/in/a"])("rejects unsafe or non-member URL %s", (url) => {
    expect(normalizeLinkedInUrl(url)).toBeNull();
    expect(patchMeSchema.safeParse({ eventSlug: "event", linkedinUrl: url }).success).toBe(false);
  });
  it("updates only the authenticated person's link, never an ID supplied by the caller", async () => {
    const response = await PATCH(request({ linkedinUrl: "linkedin.com/in/example?trk=x", userId: "victim" }));
    expect(response.status).toBe(200);
    expect(state.patch).toHaveBeenCalledWith({ linkedin_url: "https://www.linkedin.com/in/example" });
    expect(state.owner).toHaveBeenCalledWith("id", "caller");
  });
  it("can remove a link without changing matchmaking fields", async () => {
    expect((await PATCH(request({ linkedinUrl: "" }))).status).toBe(200);
    expect(state.patch).toHaveBeenCalledWith({ linkedin_url: null });
  });
  it("rejects unauthenticated and non-member requests", async () => {
    state.user = null;
    expect((await PATCH(request({ linkedinUrl: "" }))).status).toBe(401);
    state.user = { id: "caller" }; state.joined = false;
    expect((await PATCH(request({ linkedinUrl: "" }))).status).toBe(404);
    expect(state.patch).not.toHaveBeenCalled();
  });
  it("rejects invalid and cross-origin writes without updating the profile", async () => {
    expect((await PATCH(request({ linkedinUrl: "https://evil.test" }))).status).toBe(400);
    expect((await PATCH(request({ linkedinUrl: "" }, "https://evil.test"))).status).toBe(403);
    expect(state.patch).not.toHaveBeenCalled();
  });
  it("does not acknowledge a failed database write", async () => {
    state.failed = true;
    const response = await PATCH(request({ linkedinUrl: "linkedin.com/in/example" }));
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Could not update profile" });
  });
});
