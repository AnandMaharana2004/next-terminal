import { getRedis } from "@/lib/redis";
import { deleteCallArtifacts } from "@/lib/call";

const CHAT_MESSAGES_KEY = "chat:messages";
const CHAT_USERS_KEY = "chat:users";
const CHAT_PRESENCE_KEY = "chat:presence";
const MAX_MESSAGES = 100;
const ONLINE_WINDOW_MS = 15_000;

export type ChatMessage = {
  callId?: string;
  callMode?: "audio" | "video";
  createdAt?: string;
  creatorId?: string;
  creatorName?: string;
  id: string;
  name: string;
  participantId?: string;
  participantName?: string;
  status?: "active" | "ended" | "pending";
  text: string;
  timestamp: string;
  type: "call_invite" | "message" | "system";
  userId?: string;
};

export type ChatPresenceUser = {
  name: string;
  online: boolean;
};

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, 500);
}

function normalizeName(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, 30);
}

function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== "object") {
    return false;
  }

  const message = value as Record<string, unknown>;

  return (
    typeof message.id === "string" &&
    typeof message.name === "string" &&
    typeof message.text === "string" &&
    typeof message.timestamp === "string" &&
    (message.type === "message" || message.type === "system" || message.type === "call_invite")
  );
}

export async function listMessages() {
  const redis = await getRedis();
  const items = await redis.lRange(CHAT_MESSAGES_KEY, -MAX_MESSAGES, -1);

  return items
    .map((item) => {
      try {
        return JSON.parse(item) as unknown;
      } catch {
        return null;
      }
    })
    .filter(isChatMessage);
}

export async function listUsers() {
  const redis = await getRedis();
  const [users, presenceMap] = await Promise.all([
    redis.sMembers(CHAT_USERS_KEY),
    redis.hGetAll(CHAT_PRESENCE_KEY),
  ]);
  const now = Date.now();

  return users
    .map((name) => {
      const lastSeen = Number(presenceMap[name] ?? "0");

      return {
        name,
        online: Number.isFinite(lastSeen) && now - lastSeen <= ONLINE_WINDOW_MS,
      } satisfies ChatPresenceUser;
    })
    .sort((left, right) => left.name.localeCompare(right.name));
}

export async function addSystemMessage(text: string) {
  const redis = await getRedis();
  const payload: ChatMessage = {
    id: crypto.randomUUID(),
    name: "System",
    text: normalizeText(text),
    timestamp: new Date().toISOString(),
    type: "system",
  };

  if (!payload.text) {
    return;
  }

  await redis.rPush(CHAT_MESSAGES_KEY, JSON.stringify(payload));
  await redis.lTrim(CHAT_MESSAGES_KEY, -MAX_MESSAGES, -1);
}

export async function addUser(name: string) {
  const cleanedName = normalizeName(name);

  if (!cleanedName) {
    return;
  }

  const redis = await getRedis();
  await redis.sAdd(CHAT_USERS_KEY, cleanedName);
  await redis.hSet(CHAT_PRESENCE_KEY, cleanedName, Date.now().toString());
}

export async function touchUserPresence(name: string) {
  const cleanedName = normalizeName(name);

  if (!cleanedName) {
    return;
  }

  const redis = await getRedis();
  await redis.sAdd(CHAT_USERS_KEY, cleanedName);
  await redis.hSet(CHAT_PRESENCE_KEY, cleanedName, Date.now().toString());
}

export async function addMessage({
  name,
  text,
  userId,
}: {
  name: string;
  text: string;
  userId: string;
}) {
  const cleanedName = normalizeName(name);
  const cleanedText = normalizeText(text);

  if (!cleanedName || !cleanedText) {
    throw new Error("Message is required.");
  }

  const redis = await getRedis();
  const payload: ChatMessage = {
    id: crypto.randomUUID(),
    name: cleanedName,
    text: cleanedText,
    timestamp: new Date().toISOString(),
    type: "message",
    userId,
  };

  await redis.rPush(CHAT_MESSAGES_KEY, JSON.stringify(payload));
  await redis.lTrim(CHAT_MESSAGES_KEY, -MAX_MESSAGES, -1);
}

export async function deleteUserAndMessages(name: string) {
  const cleanedName = normalizeName(name);

  if (!cleanedName) {
    throw new Error("User name is required.");
  }

  const redis = await getRedis();
  const items = await redis.lRange(CHAT_MESSAGES_KEY, 0, -1);
  const deletedCallIds = new Set<string>();
  const filteredItems = items.filter((item) => {
    try {
      const parsed = JSON.parse(item) as unknown;

      if (!isChatMessage(parsed)) {
        return false;
      }

      if (parsed.name === cleanedName) {
        if (parsed.type === "call_invite" && parsed.callId) {
          deletedCallIds.add(parsed.callId);
        }
        return false;
      }

      if (parsed.type === "system" && parsed.text === `${cleanedName} joined`) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  });

  const multi = redis.multi();
  multi.sRem(CHAT_USERS_KEY, cleanedName);
  multi.hDel(CHAT_PRESENCE_KEY, cleanedName);
  multi.del(CHAT_MESSAGES_KEY);

  if (filteredItems.length > 0) {
    multi.rPush(CHAT_MESSAGES_KEY, filteredItems);
    multi.lTrim(CHAT_MESSAGES_KEY, -MAX_MESSAGES, -1);
  }

  await multi.exec();

  for (const callId of deletedCallIds) {
    await deleteCallArtifacts(callId);
  }
}
