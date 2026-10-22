import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDemoMember, listDemoAttendees, removeDemoMember, setDemoVisibility, upsertDemoMember } from "@/lib/demo/local-pool";

function memoryStorage() {
  const values = new Map<string, string>();
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
}
const profile = { displayName: "Ada", linkedinUrl: "https://www.linkedin.com/in/ada", avatarSeed: "ada", building: "AI agents", lookingFor: "Designers", visible: true, venueLat: 51.49329, venueLng: -0.22571 };

describe("demo membership lifecycle", () => {
  beforeEach(() => {
    vi.stubGlobal("window", {});
    vi.stubGlobal("localStorage", memoryStorage());
    vi.stubGlobal("sessionStorage", memoryStorage());
    vi.stubGlobal("BroadcastChannel", undefined);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("preserves all profile fields and identity across hide/show", () => {
    upsertDemoMember("event", profile);
    const original = getDemoMember("event");
    setDemoVisibility("event", false);
    expect(listDemoAttendees("event")).toEqual([]);
    expect(getDemoMember("event")).toEqual({ ...original, visible: false });
    setDemoVisibility("event", true);
    expect(getDemoMember("event")).toEqual(original);
  });
  it("keeps a hidden membership available for restoration", () => {
    upsertDemoMember("event", { ...profile, visible: false });
    expect(getDemoMember("event")?.displayName).toBe("Ada");
    expect(listDemoAttendees("event")).toEqual([]);
  });
  it("keeps each tab's identity separate and removes only the leaver", () => {
    sessionStorage.setItem("bumpin-demo-identity", "phone-a");
    upsertDemoMember("event", profile);
    sessionStorage.setItem("bumpin-demo-identity", "phone-b");
    upsertDemoMember("event", { ...profile, displayName: "Bob" });
    expect(listDemoAttendees("event").map((m) => [m.displayName, m.isSelf])).toEqual([["Ada", false], ["Bob", true]]);
    removeDemoMember("event");
    expect(getDemoMember("event")).toBeNull();
    expect(listDemoAttendees("event").map((m) => m.displayName)).toEqual(["Ada"]);
  });
  it("does not merge two people with the same name and avatar", () => {
    sessionStorage.setItem("bumpin-demo-identity", "a");
    upsertDemoMember("event", profile);
    sessionStorage.setItem("bumpin-demo-identity", "b");
    upsertDemoMember("event", profile);
    expect(listDemoAttendees("event")).toHaveLength(2);
  });
  it("keeps other events intact on leave", () => {
    upsertDemoMember("event", profile);
    upsertDemoMember("other", profile);
    removeDemoMember("event");
    expect(getDemoMember("other")).not.toBeNull();
  });
});
