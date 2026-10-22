import { ConciergeError, type eventContext } from "./server";

export type AccessStatus = "required" | "pending" | "approved" | "revoked";
export async function conciergeAccess(
  context: Awaited<ReturnType<typeof eventContext>>,
  requestAccess = false,
): Promise<AccessStatus> {
  const { data, error } = await context.client.rpc(
    requestAccess ? "request_concierge_access" : "concierge_access_status",
    { p_event_slug: context.eventSlug },
  );
  if (error || !["required", "pending", "approved", "revoked"].includes(data))
    throw new ConciergeError("Access requests are unavailable. Please retry.", 503);
  return data as AccessStatus;
}

export async function requireConciergeAccess(
  context: Awaited<ReturnType<typeof eventContext>>,
) {
  if ((await conciergeAccess(context)) !== "approved")
    throw new ConciergeError("Request access to use voice and AI matching.", 403);
}
