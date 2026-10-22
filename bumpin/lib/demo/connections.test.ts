import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import {
  createDemoConnection,
  getDemoStage,
  listDemoConnections,
  updateDemoConnection,
} from "@/lib/demo/connections";
import {
  getDemoMember,
  removeDemoMember,
  setDemoVisibility,
  updateDemoProfile,
  upsertDemoMember,
} from "@/lib/demo/local-pool";
const storage = () => {
  const values = new Map<string, string>();
  return {
    getItem: (k: string) => values.get(k) ?? null,
    setItem: (k: string, v: string) => {
      values.set(k, v);
    },
  };
};
const identity = (id: string) =>
  sessionStorage.setItem("bumpin-demo-identity", id);
const base = {
  displayName: "A",
  avatarSeed: "a",
  linkedinUrl: "https://www.linkedin.com/in/private",
  building: "AI events",
  canHelpWith: "Development",
  lookingFor: "Design",
  visible: true,
  venueLat: 1,
  venueLng: 1,
};
function request() {
  identity("a");
  return createDemoConnection("event", "b");
}
function accepted() {
  const c = request();
  identity("b");
  return updateDemoConnection("event", c.id, { action: "accept" });
}
function approved() {
  const c = accepted();
  updateDemoConnection("event", c.id, {
    action: "approveStage",
    expectedRevision: c.revision,
  });
  identity("a");
  updateDemoConnection("event", c.id, {
    action: "approveStage",
    expectedRevision: c.revision,
  });
  return c;
}
describe("preview introductions", () => {
  beforeEach(() => {
    vi.stubGlobal("window", {});
    vi.stubGlobal("localStorage", storage());
    vi.stubGlobal("sessionStorage", storage());
    vi.stubGlobal("BroadcastChannel", undefined);
    identity("a");
    upsertDemoMember("event", base);
    identity("b");
    upsertDemoMember("event", {
      ...base,
      displayName: "B",
      canHelpWith: "Design",
      lookingFor: "Development",
    });
  });
  afterEach(() => vi.unstubAllGlobals());
  it("enforces participants and transitions and deduplicates opposite requests", () => {
    const c = request();
    expect(createDemoConnection("event", "b").id).toBe(c.id);
    expect(() =>
      updateDemoConnection("event", c.id, { action: "accept" }),
    ).toThrow(/recipient/);
    identity("b");
    expect(createDemoConnection("event", "a").id).toBe(c.id);
    expect(
      updateDemoConnection("event", c.id, { action: "accept" }).status,
    ).toBe("accepted");
    identity("outsider");
    expect(listDemoConnections("event")).toEqual([]);
    expect(() =>
      updateDemoConnection("event", c.id, { action: "withdraw" }),
    ).toThrow();
  });
  it("requires both approvals, publishes no contact links, and revokes on hide", () => {
    const c = accepted();
    expect(getDemoStage("event", c.id)).toBeNull();
    updateDemoConnection("event", c.id, {
      action: "approveStage",
      expectedRevision: c.revision,
    });
    expect(getDemoStage("event", c.id)).toBeNull();
    identity("a");
    updateDemoConnection("event", c.id, {
      action: "approveStage",
      expectedRevision: c.revision,
    });
    expect(getDemoStage("event", c.id)?.people[0].displayName).toBe("A");
    expect(JSON.stringify(getDemoStage("event", c.id))).not.toContain(
      "linkedin",
    );
    setDemoVisibility("event", false);
    expect(getDemoStage("event", c.id)).toBeNull();
    expect(listDemoConnections("event")[0].status).toBe("withdrawn");
  });
  it("joke edits invalidate both approvals and stale previews cannot approve", () => {
    const c = approved();
    const changed = updateDemoConnection("event", c.id, {
      action: "chooseJoke",
      jokeId: "tabs",
    });
    expect(changed.ownStageApproved).toBe(false);
    expect(changed.otherStageApproved).toBe(false);
    expect(changed.snapshot.jokes[0]).toContain("47 open tabs");
    expect(() =>
      updateDemoConnection("event", c.id, {
        action: "approveStage",
        expectedRevision: c.revision,
      }),
    ).toThrow(/Preview changed/);
    expect(getDemoStage("event", c.id)).toBeNull();
  });
  it("profile changes clear approvals; leaving removes the connection", () => {
    const c = approved();
    updateDemoProfile("event", {
      building: "New project",
      canHelpWith: "Development",
      lookingFor: "Design",
    });
    expect(getDemoMember("event")?.building).toBe("New project");
    expect(getDemoStage("event", c.id)).toBeNull();
    removeDemoMember("event");
    identity("b");
    expect(listDemoConnections("event")).toEqual([]);
  });
  it("recipient can pass but cannot withdraw; sender cannot accept", () => {
    const c = request();
    identity("b");
    expect(() =>
      updateDemoConnection("event", c.id, { action: "withdraw" }),
    ).toThrow();
    expect(
      updateDemoConnection("event", c.id, { action: "decline" }).status,
    ).toBe("declined");
    expect(() =>
      updateDemoConnection("event", c.id, { action: "accept" }),
    ).toThrow();
  });
});
