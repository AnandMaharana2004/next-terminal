import { createCallInvite } from "@/lib/call";
import { getChatSession } from "@/lib/chat-session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getChatSession();

  if (!user) {
    return Response.json({ error: "Join the chat first." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { mode?: unknown };
  const callMode = body.mode === "audio" || body.mode === "video" ? body.mode : "video";

  const result = await createCallInvite({
    callMode,
    creatorId: user.id,
    creatorName: user.name,
  });

  return Response.json({
    callId: result.callId,
    mode: callMode,
    ok: true,
  });
}
