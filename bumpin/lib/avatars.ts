import { createAvatar } from "@dicebear/core";
import { adventurer } from "@dicebear/collection";

export function avatarDataUri(seed: string): string {
  const avatar = createAvatar(adventurer, {
    seed,
    size: 128,
  });
  return avatar.toDataUri();
}

export function randomAvatarSeed(): string {
  return crypto.randomUUID().slice(0, 8);
}
