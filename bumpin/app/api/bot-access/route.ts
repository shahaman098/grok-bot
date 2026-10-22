import { z } from "zod";
import { authenticatedClient, mutationGuard, privateHeaders } from "@/lib/connections/api";

const input = z.object({ eventSlug: z.string().trim().min(1).max(64), consent: z.literal(true).optional() }).strict();
async function handle(request: Request) {
  const rejected = mutationGuard(request);
  if (rejected) return rejected;
  try {
    const body = input.safeParse(await request.json());
    if (!body.success || (request.method === "POST" && body.data.consent !== true))
      return Response.json({ error: "Explicit event-sharing consent is required." }, { status: 400, headers: privateHeaders });
    const client = await authenticatedClient();
    if (!client) return Response.json({ error: "Join the event first." }, { status: 401, headers: privateHeaders });
    const { data, error } = await client.rpc(request.method === "POST" ? "create_bot_access" : "revoke_bot_access", { p_event_slug: body.data.eventSlug });
    if (error) return Response.json({ error: error.code === "42501" ? "Become visible at this event first." : "Bot connection setup is unavailable." }, { status: error.code === "42501" ? 403 : 503, headers: privateHeaders });
    return Response.json(request.method === "POST" ? data : { revoked: true }, { headers: privateHeaders });
  } catch {
    return Response.json({ error: "Could not update the bot connection." }, { status: 400, headers: privateHeaders });
  }
}
export { handle as POST, handle as DELETE };
