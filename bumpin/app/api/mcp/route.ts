import { botMcp } from "@/lib/bot/mcp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handle(request: Request) {
  // Native/remote clients send no Origin. Browsers must be on this app's origin.
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    return Response.json({ error: "Origin not allowed" }, { status: 403 });
  const response = await botMcp.fetch(request);
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
export { handle as POST, handle as GET, handle as DELETE };
