import { deleteUserAndMessages } from "@/lib/chat";
import { clearChatSession, getChatSession } from "@/lib/chat-session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  const user = await getChatSession();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  await deleteUserAndMessages(user.name);
  await clearChatSession();

  return Response.json({ ok: true });
}
