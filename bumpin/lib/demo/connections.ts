import { getDemoMember, listDemoAttendees } from "@/lib/demo/local-pool";
import { recommendForProfile } from "@/lib/matching/rules";
import { jokeText } from "@/lib/connections/content";
import type {
  Connection,
  ConnectionAction,
  StagePerson,
  StageSnapshot,
  PublicAttendee,
} from "@/lib/types";

type Stored = Omit<
  Connection,
  "role" | "ownStageApproved" | "otherStageApproved" | "ownJokeId"
> & {
  sender: string;
  recipient: string;
  senderStage: boolean;
  recipientStage: boolean;
  senderJoke: string | null;
  recipientJoke: string | null;
};
const key = (slug: string) => `bumpin-connections-v1:${slug}`;
function read(slug: string): Stored[] {
  try {
    const data = JSON.parse(localStorage.getItem(key(slug)) ?? "[]");
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}
function write(slug: string, connections: Stored[]) {
  localStorage.setItem(key(slug), JSON.stringify(connections));
  if (typeof BroadcastChannel !== "undefined") {
    const channel = new BroadcastChannel("bumpin-demo");
    channel.postMessage({ slug });
    channel.close();
  }
}
function snapshot(c: Stored): Connection["snapshot"] {
  return {
    ...c.snapshot,
    jokes: [jokeText(c.senderJoke), jokeText(c.recipientJoke)],
  };
}
function view(c: Stored, id: string): Connection {
  const sender = c.sender === id;
  return {
    id: c.id,
    status: c.status,
    role: sender ? "sender" : "recipient",
    revision: c.revision,
    ownStageApproved: sender ? c.senderStage : c.recipientStage,
    otherStageApproved: sender ? c.recipientStage : c.senderStage,
    ownJokeId: sender ? c.senderJoke : c.recipientJoke,
    snapshot: snapshot(c),
  };
}
export function listDemoConnections(slug: string): Connection[] {
  const self = getDemoMember(slug);
  return self
    ? read(slug)
        .filter(
          (c) =>
            c.sender === self.membershipId || c.recipient === self.membershipId,
        )
        .map((c) => view(c, self.membershipId))
    : [];
}
function person(a: PublicAttendee): StagePerson {
  return {
    displayName: a.displayName,
    avatarSeed: a.avatarSeed,
    building: a.building ?? null,
    canHelpWith: a.canHelpWith ?? null,
    lookingFor: a.lookingFor ?? null,
  };
}
export function createDemoConnection(slug: string, target: string): Connection {
  const self = getDemoMember(slug);
  if (!self?.visible || target === self.membershipId)
    throw new Error("Become visible to request an introduction.");
  const attendees = listDemoAttendees(slug);
  const other = attendees.find((a) => a.membershipId === target);
  const match = recommendForProfile(self, attendees).find(
    (m) => m.membershipId === target,
  );
  if (!other || !match) throw new Error("This match is no longer available.");
  const connections = read(slug);
  const existing = connections.find(
    (c) =>
      (c.sender === self.membershipId && c.recipient === target) ||
      (c.recipient === self.membershipId && c.sender === target),
  );
  if (existing) return view(existing, self.membershipId);
  const c: Stored = {
    id: crypto.randomUUID(),
    status: "pending",
    sender: self.membershipId,
    recipient: target,
    senderStage: false,
    recipientStage: false,
    senderJoke: null,
    recipientJoke: null,
    revision: 1,
    snapshot: {
      people: [person(self), person(other)],
      category: match.category,
      evidence: match.evidence,
      conversationStarter: match.conversationStarter,
      suggestedTask: match.suggestedTask,
      jokes: [null, null],
    },
  };
  write(slug, [c, ...connections]);
  return view(c, self.membershipId);
}
export function updateDemoConnection(
  slug: string,
  id: string,
  action: ConnectionAction,
): Connection {
  const self = getDemoMember(slug);
  const connections = read(slug);
  const c = connections.find((c) => c.id === id);
  if (
    !self?.visible ||
    !c ||
    (c.sender !== self.membershipId && c.recipient !== self.membershipId)
  )
    throw new Error("Connection unavailable.");
  const visibleIds = listDemoAttendees(slug).map((p) => p.membershipId);
  if (!visibleIds.includes(c.sender) || !visibleIds.includes(c.recipient))
    throw new Error("Attendee unavailable.");
  const sender = c.sender === self.membershipId;
  if (action.action === "accept" || action.action === "decline") {
    if (sender || c.status !== "pending")
      throw new Error("Only the recipient can respond to a pending request.");
    c.status = action.action === "accept" ? "accepted" : "declined";
  } else if (action.action === "withdraw") {
    if (!sender || !["pending", "accepted"].includes(c.status))
      throw new Error("Only the sender can withdraw an active request.");
    c.status = "withdrawn";
    c.senderStage = false;
    c.recipientStage = false;
  } else {
    if (c.status !== "accepted")
      throw new Error("Accept the introduction first.");
    if (action.action === "chooseJoke") {
      if (action.jokeId && !jokeText(action.jokeId))
        throw new Error("Invalid joke.");
      if (sender) c.senderJoke = action.jokeId ?? null;
      else c.recipientJoke = action.jokeId ?? null;
      c.senderStage = false;
      c.recipientStage = false;
      c.revision++;
    } else if (action.action === "approveStage") {
      if (action.expectedRevision !== c.revision)
        throw new Error("Preview changed; review it again.");
      if (sender) c.senderStage = true;
      else c.recipientStage = true;
    } else if (action.action === "revokeStage") {
      if (sender) c.senderStage = false;
      else c.recipientStage = false;
    }
  }
  write(slug, connections);
  return view(c, self.membershipId);
}
export function getDemoStage(slug: string, id: string): StageSnapshot | null {
  const c = read(slug).find((c) => c.id === id);
  if (!c || c.status !== "accepted" || !c.senderStage || !c.recipientStage)
    return null;
  const ids = listDemoAttendees(slug).map((a) => a.membershipId);
  if (!ids.includes(c.sender) || !ids.includes(c.recipient)) return null;
  const value = snapshot(c);
  return {
    people: value.people,
    category: value.category,
    evidence: value.evidence,
    jokes: value.jokes,
    suggestedTask: value.suggestedTask,
  };
}
export function invalidateDemoConnections(
  slug: string,
  id: string,
  reason: "hidden" | "leave" | "profile",
) {
  const connections = read(slug);
  const next =
    reason === "leave"
      ? connections.filter((c) => c.sender !== id && c.recipient !== id)
      : connections.map((c) => {
          if (
            (c.sender === id || c.recipient === id) &&
            ["pending", "accepted"].includes(c.status)
          ) {
            c.senderStage = false;
            c.recipientStage = false;
            c.revision++;
            if (reason === "hidden") c.status = "withdrawn";
          }
          return c;
        });
  write(slug, next);
}
