import { NextResponse } from "next/server";
import { z } from "zod";
import {
  authenticatedClient,
  privateHeaders,
  rpcFailure,
  mutationGuard,
} from "@/lib/connections/api";
import { connectionActionSchema } from "@/lib/validation";
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const guard = mutationGuard(request);
  if (guard) return guard;
  const { id } = await context.params;
  const parsed = connectionActionSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!z.uuid().safeParse(id).success || !parsed.success)
    return NextResponse.json(
      { error: "Invalid introduction action" },
      { status: 400 },
    );
  try {
    const client = await authenticatedClient();
    if (!client)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = parsed.data;
    const { data, error } = await client.rpc("update_connection", {
      p_id: id,
      p_action: body.action,
      p_joke: "jokeId" in body ? body.jokeId : null,
      p_revision: "expectedRevision" in body ? body.expectedRevision : null,
    });
    if (error) return rpcFailure(error);
    return NextResponse.json({ connection: data }, { headers: privateHeaders });
  } catch {
    return NextResponse.json(
      { error: "Could not update introduction" },
      { status: 503 },
    );
  }
}
