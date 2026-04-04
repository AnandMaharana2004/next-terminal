import { pollCallSignals } from "@/lib/call";
import { getChatSession } from "@/lib/chat-session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const user = await getChatSession();

  if (!user) {
    return Response.json({ error: "Join the chat first." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const callId = searchParams.get("callId") ?? "";

  if (!callId) {
    return Response.json({ error: "Call id is required." }, { status: 400 });
  }

  const result = await pollCallSignals({
    callId,
    userId: user.id,
  });

  return Response.json(result);
}
