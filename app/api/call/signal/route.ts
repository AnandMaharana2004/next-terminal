import { endCall, sendCallSignal } from "@/lib/call";
import { getChatSession } from "@/lib/chat-session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getChatSession();

  if (!user) {
    return Response.json({ error: "Join the chat first." }, { status: 401 });
  }

  const body = (await request.json()) as {
    callId?: unknown;
    payload?: unknown;
    signalType?: unknown;
    targetUserId?: unknown;
  };
  const callId = typeof body.callId === "string" ? body.callId : "";
  const targetUserId = typeof body.targetUserId === "string" ? body.targetUserId : "";
  const signalType =
    body.signalType === "answer" ||
    body.signalType === "hangup" ||
    body.signalType === "ice-candidate" ||
    body.signalType === "offer"
      ? body.signalType
      : null;

  if (!callId || !targetUserId || !signalType) {
    return Response.json({ error: "Invalid call signal." }, { status: 400 });
  }

  await sendCallSignal({
    callId,
    fromUserId: user.id,
    payload: body.payload,
    signalType,
    targetUserId,
  });

  if (signalType === "hangup") {
    await endCall({ callId });
  }

  return Response.json({ ok: true });
}
