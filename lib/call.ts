import { randomUUID } from "node:crypto";
import { getRedis } from "@/lib/redis";

const CALL_KEY_PREFIX = "call:";
const CALL_SIGNAL_KEY_PREFIX = "call-signal:";
const CHAT_MESSAGES_KEY = "chat:messages";
const MAX_MESSAGES = 100;

export type CallStatus = "pending" | "active" | "ended";
export type CallMode = "audio" | "video";

export type CallInviteMessage = {
  callId: string;
  callMode: CallMode;
  createdAt: string;
  creatorId: string;
  creatorName: string;
  id: string;
  name: string;
  participantId?: string;
  participantName?: string;
  status: CallStatus;
  text: string;
  timestamp: string;
  type: "call_invite";
};

type StoredCall = {
  callMode: CallMode;
  createdAt: string;
  creatorId: string;
  creatorName: string;
  participantId: string;
  participantName: string;
  status: CallStatus;
};

export type CallState = {
  callId: string;
  callMode: CallMode;
  createdAt: string;
  creatorId: string;
  creatorName: string;
  participantId: string | null;
  participantName: string | null;
  status: CallStatus;
};

export type CallSignalEnvelope = {
  callId: string;
  fromUserId: string;
  payload: unknown;
  signalType: "answer" | "hangup" | "ice-candidate" | "offer";
};

function getCallKey(callId: string) {
  return `${CALL_KEY_PREFIX}${callId}`;
}

function getSignalKey(callId: string, userId: string) {
  return `${CALL_SIGNAL_KEY_PREFIX}${callId}:${userId}`;
}

function mapStoredCall(callId: string, stored: Record<string, string>): CallState | null {
  if (!stored.creatorId || !stored.creatorName || !stored.createdAt || !stored.status) {
    return null;
  }

  const status = stored.status as CallStatus;
  const callMode = stored.callMode === "audio" ? "audio" : "video";

  if (!["pending", "active", "ended"].includes(status)) {
    return null;
  }

  return {
    callId,
    callMode,
    createdAt: stored.createdAt,
    creatorId: stored.creatorId,
    creatorName: stored.creatorName,
    participantId: stored.participantId || null,
    participantName: stored.participantName || null,
    status,
  };
}

async function replaceCallInviteMessage(callMessage: CallInviteMessage) {
  const redis = await getRedis();
  const items = await redis.lRange(CHAT_MESSAGES_KEY, 0, -1);
  const updated = items.map((item) => {
    try {
      const parsed = JSON.parse(item) as { callId?: string; type?: string };

      if (parsed.type === "call_invite" && parsed.callId === callMessage.callId) {
        return JSON.stringify(callMessage);
      }

      return item;
    } catch {
      return item;
    }
  });

  const multi = redis.multi();
  multi.del(CHAT_MESSAGES_KEY);

  if (updated.length > 0) {
    multi.rPush(CHAT_MESSAGES_KEY, updated);
    multi.lTrim(CHAT_MESSAGES_KEY, -MAX_MESSAGES, -1);
  }

  await multi.exec();
}

export async function createCallInvite({
  callMode,
  creatorId,
  creatorName,
}: {
  callMode: CallMode;
  creatorId: string;
  creatorName: string;
}) {
  const redis = await getRedis();
  const callId = randomUUID();
  const createdAt = new Date().toISOString();
  const callState: StoredCall = {
    callMode,
    createdAt,
    creatorId,
    creatorName,
    participantId: "",
    participantName: "",
    status: "pending",
  };
  const callMessage: CallInviteMessage = {
    callId,
    callMode,
    createdAt,
    creatorId,
    creatorName,
    id: callId,
    name: creatorName,
    status: "pending",
    text: `${creatorName} started a ${callMode} call`,
    timestamp: createdAt,
    type: "call_invite",
  };

  const multi = redis.multi();
  multi.hSet(getCallKey(callId), callState);
  multi.rPush(CHAT_MESSAGES_KEY, JSON.stringify(callMessage));
  multi.lTrim(CHAT_MESSAGES_KEY, -MAX_MESSAGES, -1);
  await multi.exec();

  return { callId, callMessage };
}

export async function getCallState(callId: string) {
  const redis = await getRedis();
  const stored = await redis.hGetAll(getCallKey(callId));

  return mapStoredCall(callId, stored);
}

export async function joinCall({
  callId,
  userId,
  userName,
}: {
  callId: string;
  userId: string;
  userName: string;
}) {
  const redis = await getRedis();
  const stored = await redis.hGetAll(getCallKey(callId));
  const callState = mapStoredCall(callId, stored);

  if (!callState) {
    throw new Error("Call not found.");
  }

  if (callState.creatorId === userId) {
    return callState;
  }

  if (callState.participantId && callState.participantId !== userId) {
    throw new Error("Call already connected.");
  }

  const nextState: CallState = {
    ...callState,
    participantId: userId,
    participantName: userName,
    status: "active",
  };
  const callMessage: CallInviteMessage = {
    callId,
    callMode: callState.callMode,
    createdAt: callState.createdAt,
    creatorId: callState.creatorId,
    creatorName: callState.creatorName,
    id: callId,
    name: callState.creatorName,
    participantId: userId,
    participantName: userName,
    status: "active",
    text: `${callState.creatorName} started a ${callState.callMode} call`,
    timestamp: callState.createdAt,
    type: "call_invite",
  };

  const multi = redis.multi();
  multi.hSet(getCallKey(callId), {
    participantId: userId,
    participantName: userName,
    status: "active",
  });
  await multi.exec();
  await replaceCallInviteMessage(callMessage);

  return nextState;
}

export async function sendCallSignal({
  callId,
  fromUserId,
  payload,
  signalType,
  targetUserId,
}: {
  callId: string;
  fromUserId: string;
  payload: unknown;
  signalType: "answer" | "hangup" | "ice-candidate" | "offer";
  targetUserId: string;
}) {
  const redis = await getRedis();
  const envelope: CallSignalEnvelope = {
    callId,
    fromUserId,
    payload,
    signalType,
  };

  await redis.rPush(getSignalKey(callId, targetUserId), JSON.stringify(envelope));
}

export async function pollCallSignals({
  callId,
  userId,
}: {
  callId: string;
  userId: string;
}) {
  const redis = await getRedis();
  const [state, signals] = await Promise.all([
    getCallState(callId),
    redis.lRange(getSignalKey(callId, userId), 0, -1),
  ]);

  await redis.del(getSignalKey(callId, userId));

  return {
    signals: signals.flatMap((item) => {
      try {
        return [JSON.parse(item) as CallSignalEnvelope];
      } catch {
        return [];
      }
    }),
    state,
  };
}

export async function endCall({
  callId,
}: {
  callId: string;
}) {
  const redis = await getRedis();
  const state = await getCallState(callId);

  if (!state) {
    return null;
  }

  const callMessage: CallInviteMessage = {
    callId,
    callMode: state.callMode,
    createdAt: state.createdAt,
    creatorId: state.creatorId,
    creatorName: state.creatorName,
    id: callId,
    name: state.creatorName,
    participantId: state.participantId ?? undefined,
    participantName: state.participantName ?? undefined,
    status: "ended",
    text: `${state.creatorName} started a ${state.callMode} call`,
    timestamp: state.createdAt,
    type: "call_invite",
  };

  await redis.hSet(getCallKey(callId), {
    status: "ended",
  });
  await replaceCallInviteMessage(callMessage);

  return state;
}

export async function deleteCallArtifacts(callId: string, participantIds: string[] = []) {
  const redis = await getRedis();
  const multi = redis.multi();
  multi.del(getCallKey(callId));

  for (const participantId of participantIds) {
    if (participantId) {
      multi.del(getSignalKey(callId, participantId));
    }
  }

  await multi.exec();
}
