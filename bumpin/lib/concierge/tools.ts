import { z } from "zod";

export const findPeopleArgs = z
  .object({ query: z.string().trim().min(1).max(300) })
  .strict();
export const focusMatchArgs = z
  .object({ membershipId: z.string().min(1).max(80) })
  .strict();

export function parseVoiceTool(name: string, args: unknown) {
  if (name === "find_people")
    return { name, ...findPeopleArgs.parse(args) } as const;
  if (name === "focus_match")
    return { name, ...focusMatchArgs.parse(args) } as const;
  throw new Error("This concierge action is not available.");
}
