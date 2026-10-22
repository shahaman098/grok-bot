import { invalidateDemoConnections } from "@/lib/demo/connections";
import { displayPositionFromSeed } from "@/lib/geo";
import type { PublicAttendee } from "@/lib/types";

const CHANNEL = "bumpin-demo";
const STORAGE_KEY = "bumpin-demo-v2";
const IDENTITY_KEY = "bumpin-demo-identity";

export type DemoMember = PublicAttendee & { visible: boolean };

function selfId(): string {
  let id = sessionStorage.getItem(IDENTITY_KEY);
  if (!id) {
    id = `demo-${crypto.randomUUID()}`;
    sessionStorage.setItem(IDENTITY_KEY, id);
  }
  return id;
}

function loadPool(slug: string): DemoMember[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(`${STORAGE_KEY}:${slug}`);
  if (!raw) return [];
  try {
    const members: unknown = JSON.parse(raw);
    return Array.isArray(members) ? members : [];
  } catch {
    return [];
  }
}

function savePool(slug: string, members: DemoMember[]) {
  localStorage.setItem(`${STORAGE_KEY}:${slug}`, JSON.stringify(members));
  if (typeof BroadcastChannel !== "undefined") {
    const bc = new BroadcastChannel(CHANNEL);
    bc.postMessage({ slug });
    bc.close();
  }
}

export function subscribeDemoPool(slug: string, onChange: () => void) {
  const bc = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(CHANNEL) : null;
  const handler = (ev: MessageEvent) => {
    if (ev.data?.slug === slug) onChange();
  };
  const onStorage = (ev: StorageEvent) => {
    if (ev.key === null || ev.key === `${STORAGE_KEY}:${slug}`) onChange();
  };
  bc?.addEventListener("message", handler);
  window.addEventListener("storage", onStorage);
  return () => {
    bc?.removeEventListener("message", handler);
    bc?.close();
    window.removeEventListener("storage", onStorage);
  };
}

export function getDemoMember(slug: string): DemoMember | null {
  const id = selfId();
  return loadPool(slug).find((m) => m.membershipId === id) ?? null;
}

export function listDemoAttendees(slug: string): PublicAttendee[] {
  const id = selfId();
  return loadPool(slug)
    .filter((m) => m.visible)
    .map((m) => ({ ...m, isSelf: m.membershipId === id }));
}

export function removeDemoMember(slug: string): void {
  const id = selfId();
  invalidateDemoConnections(slug, id, "leave");
  savePool(slug, loadPool(slug).filter((m) => m.membershipId !== id));
}

export function setDemoVisibility(slug: string, visible: boolean): void {
  const id = selfId();
  if (!visible) invalidateDemoConnections(slug, id, "hidden");
  savePool(slug, loadPool(slug).map((m) => m.membershipId === id ? { ...m, visible } : m));
}

export function upsertDemoMember(
  slug: string,
  input: {
    displayName: string;
    linkedinUrl: string | null;
    avatarSeed: string;
    building: string | null;
    canHelpWith?: string | null;
    lookingFor: string | null;
    visible: boolean;
    venueLat: number;
    venueLng: number;
  },
): void {
  const membershipId = selfId();
  const pos = displayPositionFromSeed(membershipId, input.venueLat, input.venueLng);
  const member: DemoMember = {
    membershipId,
    displayName: input.displayName,
    linkedinUrl: input.linkedinUrl,
    avatarSeed: input.avatarSeed,
    building: input.building,
    canHelpWith: input.canHelpWith ?? null,
    lookingFor: input.lookingFor,
    displayLat: pos.lat,
    displayLng: pos.lng,
    visible: input.visible,
  };
  savePool(slug, [...loadPool(slug).filter((m) => m.membershipId !== membershipId), member]);
}

export function updateDemoProfile(slug: string, input: { building: string; canHelpWith: string; lookingFor: string }) {
  const id = selfId();
  const original = getDemoMember(slug);
  if (!original) throw new Error("Join this event first.");
  const next = { building: input.building.trim() || null, canHelpWith: input.canHelpWith.trim() || null, lookingFor: input.lookingFor.trim() || null };
  if (original.building !== next.building || original.canHelpWith !== next.canHelpWith || original.lookingFor !== next.lookingFor) invalidateDemoConnections(slug, id, "profile");
  savePool(slug, loadPool(slug).map((m) => m.membershipId === id ? { ...m, ...next } : m));
}
