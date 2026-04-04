import { createCallInvite } from "@/lib/call";
import { getChatSession } from "@/lib/chat-session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  const user = await getChatSession();

  if (!user) {
    return Response.json({ error: "Join the chat first." }, { status: 401 });
  }

  const result = await createCallInvite({
    creatorId: user.id,
    creatorName: user.name,
  });

  return Response.json({
    callId: result.callId,
    ok: true,
  });
}
