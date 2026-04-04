import { createClient, type RedisClientType } from "redis";

declare global {
  var __nextTerminalRedisClient__: RedisClientType | undefined;
}

function getRedisUrl() {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    throw new Error("REDIS_URL is not configured.");
  }

  return redisUrl;
}

export async function getRedis() {
  if (!globalThis.__nextTerminalRedisClient__) {
    globalThis.__nextTerminalRedisClient__ = createClient({
      url: getRedisUrl(),
    });

    globalThis.__nextTerminalRedisClient__.on("error", (error) => {
      console.error("Redis client error", error);
    });
  }

  const client = globalThis.__nextTerminalRedisClient__;

  if (!client.isOpen) {
    await client.connect();
  }

  return client;
}
