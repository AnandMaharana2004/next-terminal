import { listMessages, listUsers, touchUserPresence } from "@/lib/chat";
import { getChatSession } from "@/lib/chat-session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const user = await getChatSession();

  if (user) {
    await touchUserPresence(user.name);
  }

  const [messages, users] = await Promise.all([listMessages(), listUsers()]);

  return Response.json({
    messages,
    user,
    users,
  });
}
