import { addSystemMessage, addUser } from "@/lib/chat";
import { createChatSession } from "@/lib/chat-session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as { name?: unknown };
  const name = typeof body.name === "string" ? body.name : "";
  const cleanedName = name.replace(/\s+/g, " ").trim().slice(0, 30);

  if (!cleanedName) {
    return Response.json({ error: "Name is required." }, { status: 400 });
  }

  const user = await createChatSession(cleanedName);
  await addUser(user.name);
  await addSystemMessage(`${user.name} joined`);

  return Response.json({ ok: true, user });
}
