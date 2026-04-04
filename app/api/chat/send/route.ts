import { addMessage, touchUserPresence } from "@/lib/chat";
import { getChatSession } from "@/lib/chat-session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getChatSession();

  if (!user) {
    return Response.json({ error: "Join the chat first." }, { status: 401 });
  }

  const body = (await request.json()) as { message?: unknown };
  const message = typeof body.message === "string" ? body.message : "";

  if (!message.trim()) {
    return Response.json({ error: "Message is required." }, { status: 400 });
  }

  await touchUserPresence(user.name);
  await addMessage({
    name: user.name,
    text: message,
    userId: user.id,
  });

  return Response.json({ ok: true });
}
