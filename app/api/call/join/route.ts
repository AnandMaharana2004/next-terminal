import { joinCall } from "@/lib/call";
import { getChatSession } from "@/lib/chat-session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getChatSession();

  if (!user) {
    return Response.json({ error: "Join the chat first." }, { status: 401 });
  }

  const body = (await request.json()) as { callId?: unknown };
  const callId = typeof body.callId === "string" ? body.callId : "";

  if (!callId) {
    return Response.json({ error: "Call id is required." }, { status: 400 });
  }

  try {
    const state = await joinCall({
      callId,
      userId: user.id,
      userName: user.name,
    });

    return Response.json({ ok: true, state });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Could not join call." },
      { status: 400 }
    );
  }
}
