import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";

const CHAT_USER_ID_COOKIE = "next-terminal-chat-user-id";
const CHAT_USER_NAME_COOKIE = "next-terminal-chat-user-name";

export type ChatUser = {
  id: string;
  name: string;
};

function sanitizeName(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, 30);
}

function getCookieOptions() {
  return {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
}

export async function getChatSession() {
  const cookieStore = await cookies();
  const id = cookieStore.get(CHAT_USER_ID_COOKIE)?.value ?? "";
  const name = sanitizeName(cookieStore.get(CHAT_USER_NAME_COOKIE)?.value ?? "");

  if (!id || !name) {
    return null;
  }

  return { id, name } satisfies ChatUser;
}

export async function createChatSession(name: string) {
  const cleanedName = sanitizeName(name);

  if (!cleanedName) {
    throw new Error("Name is required.");
  }

  const session = {
    id: randomUUID(),
    name: cleanedName,
  } satisfies ChatUser;
  const cookieStore = await cookies();
  const options = getCookieOptions();

  cookieStore.set(CHAT_USER_ID_COOKIE, session.id, options);
  cookieStore.set(CHAT_USER_NAME_COOKIE, session.name, options);

  return session;
}

export async function clearChatSession() {
  const cookieStore = await cookies();
  cookieStore.delete(CHAT_USER_ID_COOKIE);
  cookieStore.delete(CHAT_USER_NAME_COOKIE);
}
