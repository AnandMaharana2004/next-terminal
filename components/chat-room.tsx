"use client";

import Link from "next/link";
import { startTransition, useCallback, useEffect, useRef, useState } from "react";

type ChatUser = {
  id: string;
  name: string;
};

type ChatMessage = {
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

type PresenceUser = {
  name: string;
  online: boolean;
};

type MessagesResponse = {
  messages: ChatMessage[];
  user: ChatUser | null;
  users: PresenceUser[];
};

type CallPollResponse = {
  signals: Array<{
    callId: string;
    fromUserId: string;
    payload: unknown;
    signalType: "answer" | "hangup" | "ice-candidate" | "offer";
  }>;
  state: {
    callId: string;
    callMode: "audio" | "video";
    createdAt: string;
    creatorId: string;
    creatorName: string;
    participantId: string | null;
    participantName: string | null;
    status: "active" | "ended" | "pending";
  } | null;
};

type CallMode = "audio" | "video";

type ActiveCall = {
  callId: string;
  callMode: CallMode;
  creatorId: string;
  creatorName: string;
  participantId: string | null;
  participantName: string | null;
  role: "callee" | "caller";
  status: "calling" | "connected" | "connecting" | "ended";
};

type PreviewCorner = "bottom-left" | "bottom-right" | "top-left" | "top-right";
type CameraFacingMode = "environment" | "user";
type CameraRequestOptions = {
  deviceId?: string;
  includeAudio: boolean;
  releaseCurrentVideo?: boolean;
};

const AUDIO_MAX_BITRATE = 32_000;
const CAMERA_MAX_BITRATE = 350_000;
const SCREEN_SHARE_MAX_BITRATE = 700_000;

function formatTime(timestamp: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

function getAvatarLetter(name: string) {
  return name.trim().charAt(0).toUpperCase() || "?";
}

function getAvatarTone(name: string) {
  const tones = [
    "bg-rose-400 text-rose-950",
    "bg-sky-400 text-sky-950",
    "bg-amber-300 text-amber-950",
    "bg-fuchsia-400 text-fuchsia-950",
    "bg-cyan-300 text-cyan-950",
    "bg-lime-300 text-lime-950",
  ];
  const seed = name.split("").reduce((total, character) => total + character.charCodeAt(0), 0);

  return tones[seed % tones.length];
}

function SendIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M21.5 3.5 10 15"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="m21.5 3.5-7 17-2.5-5.5L6.5 12l15-8.5Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function VideoIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M15 8.5a2.5 2.5 0 0 0-2.5-2.5h-6A2.5 2.5 0 0 0 4 8.5v7A2.5 2.5 0 0 0 6.5 18h6a2.5 2.5 0 0 0 2.5-2.5v-7Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="m15 10 4.5-2v8L15 14"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function AudioCallIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M7.2 5.6c.8-.8 2.2-.8 3 0l1.2 1.2c.7.7.8 1.8.2 2.6l-1.1 1.4c-.2.3-.3.7-.1 1 1 1.8 2.5 3.3 4.3 4.3.3.2.7.1 1-.1l1.4-1.1c.8-.6 1.9-.5 2.6.2l1.2 1.2c.8.8.8 2.2 0 3-.9.9-2.2 1.3-3.4 1.1-3.1-.6-6.1-2.3-8.7-4.9S5.1 11 4.5 7.9c-.2-1.2.2-2.5 1.1-3.4Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4.5 w-4.5"
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M20 12a8 8 0 1 1-2.34-5.66"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
      <path
        d="M20 4v4h-4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function ToggleIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4.5 w-4.5"
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        height="8"
        rx="4"
        stroke="currentColor"
        strokeWidth="1.8"
        width="16"
        x="4"
        y="8"
      />
      <circle
        cx="9"
        cy="12"
        fill="currentColor"
        r="2.2"
      />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4 7h16M4 12h16M4 17h16"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M6 6 18 18M18 6 6 18"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function EndCallIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-6 w-6"
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M5.5 15.5c3.6-2.8 9.4-2.8 13 0"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.9"
      />
      <path
        d="M7.3 14.6 4.8 18"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.9"
      />
      <path
        d="M16.7 14.6 19.2 18"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.9"
      />
    </svg>
  );
}

function MicOnIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 15a3 3 0 0 0 3-3V7a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M6.5 11.5a5.5 5.5 0 1 0 11 0M12 17v3M9 20h6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function MicOffIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M15 10.8V7a3 3 0 1 0-6 0v2.6"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M6.5 11.5a5.5 5.5 0 0 0 8.8 4.4M12 17v3M9 20h6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
      <path
        d="M4 4 20 20"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function SoundOnIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M5 14h3l4 4V6L8 10H5v4Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M16 9.5a4 4 0 0 1 0 5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
      <path
        d="M18.5 7a7.5 7.5 0 0 1 0 10"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function SoundOffIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M5 14h3l4 4V6L8 10H5v4Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M16 10.5 20 14.5M20 10.5 16 14.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function ScreenShareIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        height="11"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.8"
        width="16"
        x="4"
        y="4"
      />
      <path
        d="M10 20h4M12 15v5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export function ChatRoom({
  initialMessages,
  initialUser,
  initialUsers,
}: {
  initialMessages: ChatMessage[];
  initialUser: ChatUser | null;
  initialUsers: PresenceUser[];
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [users, setUsers] = useState(initialUsers);
  const [currentUser, setCurrentUser] = useState(initialUser);
  const [name, setName] = useState("");
  const [draft, setDraft] = useState("");
  const [joinError, setJoinError] = useState("");
  const [sendError, setSendError] = useState("");
  const [callError, setCallError] = useState("");
  const [joining, setJoining] = useState(false);
  const [sending, setSending] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [refreshingMessages, setRefreshingMessages] = useState(false);
  const [pollingEnabled, setPollingEnabled] = useState(false);
  const [micMuted, setMicMuted] = useState(false);
  const [soundMuted, setSoundMuted] = useState(false);
  const [cameraFacingMode] = useState<CameraFacingMode>("user");
  const [canScreenShare] = useState(() => {
    if (typeof navigator === "undefined") {
      return false;
    }

    return Boolean(navigator.mediaDevices?.getDisplayMedia);
  });
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [previewCorner, setPreviewCorner] = useState<PreviewCorner>("bottom-right");
  const listRef = useRef<HTMLDivElement | null>(null);
  const draftInputRef = useRef<HTMLInputElement | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const cameraPreviewStreamRef = useRef<MediaStream | null>(null);
  const displayStreamRef = useRef<MediaStream | null>(null);
  const callStageRef = useRef<HTMLDivElement | null>(null);
  const previewDragRef = useRef<{
    pointerId: number | null;
    startX: number;
    startY: number;
  }>({
    pointerId: null,
    startX: 0,
    startY: 0,
  });
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const offerSentForCallRef = useRef<string | null>(null);
  const currentCameraDeviceIdRef = useRef<string | null>(null);

  const syncRemoteAudioOutput = useCallback(() => {
    if (!remoteAudioRef.current) {
      return;
    }

    remoteAudioRef.current.muted = soundMuted;
    remoteAudioRef.current.volume = activeCall?.callMode === "audio" ? 1 : 0.82;
  }, [activeCall?.callMode, soundMuted]);

  useEffect(() => {
    if (!mobileMenuOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (localVideoRef.current && cameraPreviewStreamRef.current) {
      localVideoRef.current.srcObject = cameraPreviewStreamRef.current;
    }

    if (remoteVideoRef.current && remoteStreamRef.current) {
      remoteVideoRef.current.srcObject = remoteStreamRef.current;
    }

    if (remoteAudioRef.current && remoteStreamRef.current) {
      remoteAudioRef.current.srcObject = remoteStreamRef.current;
      syncRemoteAudioOutput();
      void remoteAudioRef.current.play().catch(() => null);
    }
  }, [activeCall, syncRemoteAudioOutput]);

  function handleDraftFocus() {
    window.setTimeout(() => {
      draftInputRef.current?.scrollIntoView({
        block: "nearest",
      });
    }, 150);
  }

  const requestCameraStream = useCallback(
    async (
      facingMode: CameraFacingMode,
      { deviceId, includeAudio, releaseCurrentVideo = false }: CameraRequestOptions
    ) => {
      const audioConstraint = includeAudio
        ? {
            audio: {
              autoGainControl: true,
              echoCancellation: true,
              noiseSuppression: true,
            },
          }
        : { audio: false };
      const videoConstraint = {
        frameRate: {
          ideal: 12,
          max: 15,
        },
        height: {
          ideal: 480,
          max: 480,
        },
        width: {
          ideal: 640,
          max: 640,
        },
      };
      const currentVideoTracks = localStreamRef.current?.getVideoTracks() ?? [];
      const stopCurrentVideoTracks = () => {
        for (const track of currentVideoTracks) {
          track.stop();
          localStreamRef.current?.removeTrack(track);
        }
      };

      if (deviceId) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            ...audioConstraint,
            video: {
              deviceId: {
                exact: deviceId,
              },
              ...videoConstraint,
            },
          });

          currentCameraDeviceIdRef.current =
            stream.getVideoTracks()[0]?.getSettings().deviceId ?? deviceId;

          return stream;
        } catch {
          // Fall through to facingMode-based selection.
        }
      }

      const attemptRequest = async () => {
        try {
          return await navigator.mediaDevices.getUserMedia({
            ...audioConstraint,
            video: {
              ...videoConstraint,
              facingMode: {
                exact: facingMode,
              },
            },
          });
        } catch {
          try {
            return await navigator.mediaDevices.getUserMedia({
              ...audioConstraint,
              video: {
                ...videoConstraint,
                facingMode: {
                  ideal: facingMode,
                },
              },
            });
          } catch {
            return navigator.mediaDevices.getUserMedia({
              ...audioConstraint,
              video: videoConstraint,
            });
          }
        }
      };

      try {
        const stream = await attemptRequest();
        currentCameraDeviceIdRef.current = stream.getVideoTracks()[0]?.getSettings().deviceId ?? null;
        return stream;
      } catch (error) {
        if (!releaseCurrentVideo || currentVideoTracks.length === 0) {
          throw error;
        }

        stopCurrentVideoTracks();
        const stream = await attemptRequest();
        currentCameraDeviceIdRef.current = stream.getVideoTracks()[0]?.getSettings().deviceId ?? null;
        return stream;
      }
    },
    []
  );

  const refreshMessages = useCallback(async () => {
    const response = await fetch("/api/chat/messages", {
      cache: "no-store",
    });

    if (!response.ok) {
      return;
    }

    const data = (await response.json()) as MessagesResponse;

    startTransition(() => {
      setMessages(data.messages);
      setUsers(data.users);
      setCurrentUser(data.user);
    });
  }, []);

  async function handleManualRefresh() {
    setRefreshingMessages(true);

    try {
      await refreshMessages();
    } finally {
      setRefreshingMessages(false);
    }
  }

  const ensureLocalStream = useCallback(async (callMode: CallMode) => {
    if (localStreamRef.current) {
      return localStreamRef.current;
    }

    const stream =
      callMode === "audio"
        ? await navigator.mediaDevices.getUserMedia({
            audio: {
              autoGainControl: true,
              echoCancellation: true,
              noiseSuppression: true,
            },
            video: false,
          })
        : await requestCameraStream(cameraFacingMode, {
            includeAudio: true,
          });

    localStreamRef.current = stream;
    const videoTrack = stream.getVideoTracks()[0];

    if (videoTrack) {
      cameraPreviewStreamRef.current = new MediaStream([videoTrack]);

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = cameraPreviewStreamRef.current;
      }
    } else {
      cameraPreviewStreamRef.current = null;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
    }

    return stream;
  }, [cameraFacingMode, requestCameraStream]);

  const cleanupCallResources = useCallback(() => {
    offerSentForCallRef.current = null;
    pendingCandidatesRef.current = [];

    if (peerConnectionRef.current) {
      peerConnectionRef.current.onicecandidate = null;
      peerConnectionRef.current.ontrack = null;
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (localStreamRef.current) {
      for (const track of localStreamRef.current.getTracks()) {
        track.stop();
      }

      localStreamRef.current = null;
    }

    if (remoteStreamRef.current) {
      for (const track of remoteStreamRef.current.getTracks()) {
        track.stop();
      }

      remoteStreamRef.current = null;
    }

    if (localVideoRef.current) {
      localVideoRef.current.pause();
      localVideoRef.current.srcObject = null;
      localVideoRef.current.load();
    }

    cameraPreviewStreamRef.current = null;

    if (remoteVideoRef.current) {
      remoteVideoRef.current.pause();
      remoteVideoRef.current.srcObject = null;
      remoteVideoRef.current.load();
    }

    if (remoteAudioRef.current) {
      remoteAudioRef.current.pause();
      remoteAudioRef.current.srcObject = null;
      remoteAudioRef.current.load();
    }

    if (displayStreamRef.current) {
      for (const track of displayStreamRef.current.getTracks()) {
        track.onended = null;
        track.stop();
      }

      displayStreamRef.current = null;
    }

    currentCameraDeviceIdRef.current = null;
    setMicMuted(false);
    setSoundMuted(false);
    setIsScreenSharing(false);
  }, []);

  const sendSignal = useCallback(async ({
    callId,
    payload,
    signalType,
    targetUserId,
  }: {
    callId: string;
    payload: unknown;
    signalType: "answer" | "hangup" | "ice-candidate" | "offer";
    targetUserId: string;
  }) => {
    await fetch("/api/call/signal", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        callId,
        payload,
        signalType,
        targetUserId,
      }),
    });
  }, []);

  const flushPendingCandidates = useCallback(async () => {
    if (!peerConnectionRef.current || !peerConnectionRef.current.remoteDescription) {
      return;
    }

    for (const candidate of pendingCandidatesRef.current) {
      try {
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {
        continue;
      }
    }

    pendingCandidatesRef.current = [];
  }, []);

  const optimizeSenderForTrack = useCallback(
    async (sender: RTCRtpSender | undefined, kind: "audio" | "video", videoSource: "camera" | "screen" = "camera") => {
      if (!sender) {
        return;
      }

      const parameters = sender.getParameters();
      const encodings = parameters.encodings && parameters.encodings.length > 0 ? parameters.encodings : [{}];

      if (kind === "audio") {
        encodings[0] = {
          ...encodings[0],
          maxBitrate: AUDIO_MAX_BITRATE,
        };
      } else {
        const isScreenShare = videoSource === "screen";

        encodings[0] = {
          ...encodings[0],
          maxBitrate: isScreenShare ? SCREEN_SHARE_MAX_BITRATE : CAMERA_MAX_BITRATE,
          maxFramerate: isScreenShare ? 10 : 15,
          scaleResolutionDownBy: isScreenShare ? 1 : 1.25,
        };
      }

      parameters.encodings = encodings;

      try {
        await sender.setParameters(parameters);
      } catch {
        // Some browsers ignore sender tuning; keep the call running.
      }
    },
    []
  );

  const replaceOutgoingVideoTrack = useCallback(async (nextVideoTrack: MediaStreamTrack, videoSource: "camera" | "screen" = "camera") => {
    const currentStream = localStreamRef.current;
    const currentAudioTracks = currentStream?.getAudioTracks() ?? [];
    const oldVideoTracks = currentStream?.getVideoTracks() ?? [];

    for (const oldTrack of oldVideoTracks) {
      oldTrack.stop();
      currentStream?.removeTrack(oldTrack);
    }

    const sender = peerConnectionRef.current
      ?.getSenders()
      .find((item) => item.track?.kind === "video");

    if (sender) {
      await sender.replaceTrack(nextVideoTrack);
      await optimizeSenderForTrack(sender, "video", videoSource);
    }

    const composedStream = new MediaStream([...currentAudioTracks, nextVideoTrack]);
    localStreamRef.current = composedStream;
  }, [optimizeSenderForTrack]);

  const updateCameraPreviewTrack = useCallback((videoTrack: MediaStreamTrack) => {
    cameraPreviewStreamRef.current = new MediaStream([videoTrack]);

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = cameraPreviewStreamRef.current;
    }
  }, []);

  async function handleJoin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setJoining(true);
    setJoinError("");

    const response = await fetch("/api/chat/join", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name }),
    });

    setJoining(false);

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setJoinError(data.error ?? "Could not join.");
      return;
    }

    const data = (await response.json()) as { user: ChatUser };
    setCurrentUser(data.user);
    setName("");
    setMobileMenuOpen(false);
    await refreshMessages();
  }

  async function handleSend(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!draft.trim()) {
      return;
    }

    setSending(true);
    setSendError("");

    const response = await fetch("/api/chat/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: draft }),
    });

    setSending(false);

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setSendError(data.error ?? "Could not send message.");
      return;
    }

    setDraft("");
    await refreshMessages();
  }

  async function handleStartCall(callMode: CallMode) {
    if (!currentUser || activeCall) {
      return;
    }

    setCallError("");

    const mediaOk = await ensureLocalStream(callMode).catch(() => null);

    if (!mediaOk) {
      setCallError(callMode === "audio" ? "Microphone access was blocked." : "Camera or microphone access was blocked.");
      return;
    }

    const response = await fetch("/api/call/request", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ mode: callMode }),
    });

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setCallError(data.error ?? "Could not start call.");
      return;
    }

    const data = (await response.json()) as { callId: string };
    setActiveCall({
      callId: data.callId,
      callMode,
      creatorId: currentUser.id,
      creatorName: currentUser.name,
      participantId: null,
      participantName: null,
      role: "caller",
      status: "calling",
    });
    await refreshMessages();
  }

  async function handleConnectCall(message: ChatMessage) {
    if (!message.callId || !currentUser) {
      return;
    }

    setCallError("");
    const callMode = message.callMode === "audio" ? "audio" : "video";

    const mediaOk = await ensureLocalStream(callMode).catch(() => null);

    if (!mediaOk) {
      setCallError(callMode === "audio" ? "Microphone access was blocked." : "Camera or microphone access was blocked.");
      return;
    }

    const response = await fetch("/api/call/join", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ callId: message.callId }),
    });

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setCallError(data.error ?? "Could not connect call.");
      return;
    }

    setActiveCall({
      callId: message.callId,
      callMode,
      creatorId: message.creatorId ?? "",
      creatorName: message.creatorName ?? message.name,
      participantId: currentUser.id,
      participantName: currentUser.name,
      role: "callee",
      status: "connecting",
    });
    await refreshMessages();
  }

  async function handleLeaveCall() {
    if (!activeCall || !currentUser) {
      cleanupCallResources();
      setActiveCall(null);
      return;
    }

    if (activeCall.status === "ended") {
      cleanupCallResources();
      setActiveCall(null);
      return;
    }

    const targetUserId =
      currentUser.id === activeCall.creatorId ? activeCall.participantId : activeCall.creatorId;

    if (targetUserId) {
      await sendSignal({
        callId: activeCall.callId,
        payload: null,
        signalType: "hangup",
        targetUserId,
      }).catch(() => null);
    }

    cleanupCallResources();
    setActiveCall(null);
    await refreshMessages();
  }

  useEffect(() => {
    const list = listRef.current;

    if (!list) {
      return;
    }

    list.scrollTop = list.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (activeCall || !pollingEnabled) {
      return;
    }

    void refreshMessages();

    const timer = window.setInterval(() => {
      void refreshMessages();
    }, 5_000);

    return () => {
      window.clearInterval(timer);
    };
  }, [activeCall, pollingEnabled, refreshMessages]);

  useEffect(() => {
    return () => {
      cleanupCallResources();
    };
  }, [cleanupCallResources]);

  useEffect(() => {
    if (!activeCall) {
      return;
    }

    async function ensurePeerConnection(targetUserId: string, callId: string, call: ActiveCall) {
      if (peerConnectionRef.current) {
        return peerConnectionRef.current;
      }

      const stream = await ensureLocalStream(call.callMode);
      const peerConnection = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });

      for (const track of stream.getTracks()) {
        peerConnection.addTrack(track, stream);
      }

      await Promise.all(
        peerConnection.getSenders().map((sender) =>
          optimizeSenderForTrack(
            sender,
            sender.track?.kind === "audio" ? "audio" : "video",
            "camera"
          )
        )
      );

      const remoteStream = new MediaStream();
      remoteStreamRef.current = remoteStream;

      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }

      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remoteStream;
        syncRemoteAudioOutput();
        void remoteAudioRef.current.play().catch(() => null);
      }

      peerConnection.ontrack = (event) => {
        for (const track of event.streams[0]?.getTracks() ?? []) {
          remoteStream.addTrack(track);
        }

        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = remoteStream;
          syncRemoteAudioOutput();
          void remoteAudioRef.current.play().catch(() => null);
        }
      };

      peerConnection.onicecandidate = (event) => {
        if (!event.candidate) {
          return;
        }

        void sendSignal({
          callId,
          payload: event.candidate.toJSON(),
          signalType: "ice-candidate",
          targetUserId,
        });
      };

      peerConnection.onconnectionstatechange = () => {
        if (peerConnection.connectionState === "connected") {
          setActiveCall((current) => (current ? { ...current, status: "connected" } : current));
        }

        if (peerConnection.connectionState === "closed" || peerConnection.connectionState === "failed") {
          cleanupCallResources();
          setActiveCall(null);
        }
      };

      peerConnectionRef.current = peerConnection;
      return peerConnection;
    }

    async function runPoll(call: ActiveCall) {
      const response = await fetch(`/api/call/poll?callId=${call.callId}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        return;
      }

      const data = (await response.json()) as CallPollResponse;

      if (data.state?.status === "ended") {
        cleanupCallResources();
        setActiveCall(null);
        return;
      }

      if (
        call.role === "caller" &&
        data.state?.status === "active" &&
        data.state.participantId &&
        offerSentForCallRef.current !== call.callId
      ) {
        const peerConnection = await ensurePeerConnection(data.state.participantId, call.callId, call);
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        await sendSignal({
          callId: call.callId,
          payload: offer,
          signalType: "offer",
          targetUserId: data.state.participantId,
        });
        offerSentForCallRef.current = call.callId;
        setActiveCall((current) =>
          current
            ? {
                ...current,
                callMode: data.state?.callMode ?? current.callMode,
                participantId: data.state?.participantId ?? null,
                participantName: data.state?.participantName ?? null,
                status: "connecting",
              }
            : current
        );
      }

      for (const signal of data.signals) {
        if (signal.signalType === "hangup") {
          cleanupCallResources();
          setActiveCall(null);
          continue;
        }

        if (signal.signalType === "offer") {
          const peerConnection = await ensurePeerConnection(signal.fromUserId, call.callId, call);
          await peerConnection.setRemoteDescription(
            new RTCSessionDescription(signal.payload as RTCSessionDescriptionInit)
          );
          await flushPendingCandidates();
          const answer = await peerConnection.createAnswer();
          await peerConnection.setLocalDescription(answer);
          await sendSignal({
            callId: call.callId,
            payload: answer,
            signalType: "answer",
            targetUserId: signal.fromUserId,
          });
          setActiveCall((current) =>
            current
              ? {
                  ...current,
                  callMode: data.state?.callMode ?? current.callMode,
                  creatorId: data.state?.creatorId ?? current.creatorId,
                  creatorName: data.state?.creatorName ?? current.creatorName,
                  participantId: data.state?.participantId ?? current.participantId,
                  participantName: data.state?.participantName ?? current.participantName,
                  status: "connecting",
                }
              : current
          );
          continue;
        }

        if (signal.signalType === "answer" && peerConnectionRef.current) {
          await peerConnectionRef.current.setRemoteDescription(
            new RTCSessionDescription(signal.payload as RTCSessionDescriptionInit)
          );
          await flushPendingCandidates();
          continue;
        }

        if (signal.signalType === "ice-candidate") {
          const candidate = signal.payload as RTCIceCandidateInit;

          if (!peerConnectionRef.current || !peerConnectionRef.current.remoteDescription) {
            pendingCandidatesRef.current.push(candidate);
            continue;
          }

          try {
            await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
          } catch {
            continue;
          }
        }
      }
    }

    const initialTimer = window.setTimeout(() => {
      void runPoll(activeCall);
    }, 0);

    const timer = window.setInterval(() => {
      void runPoll(activeCall);
    }, 5_000);

    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(timer);
    };
  }, [activeCall, cleanupCallResources, ensureLocalStream, flushPendingCandidates, optimizeSenderForTrack, refreshMessages, sendSignal, soundMuted, syncRemoteAudioOutput]);

  function toggleMute() {
    const stream = localStreamRef.current;

    if (!stream) {
      return;
    }

    const nextMuted = !micMuted;

    for (const track of stream.getAudioTracks()) {
      track.enabled = !nextMuted;
    }

    setMicMuted(nextMuted);
  }

  function toggleSound() {
    const nextMuted = !soundMuted;

    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = nextMuted;
    }

    setSoundMuted(nextMuted);
  }

  async function switchBackToCamera() {
    if (!activeCall || activeCall.callMode !== "video") {
      return;
    }

    const nextCameraStream = await requestCameraStream(cameraFacingMode, {
      deviceId: currentCameraDeviceIdRef.current ?? undefined,
      includeAudio: false,
      releaseCurrentVideo: true,
    });
    const nextCameraTrack = nextCameraStream.getVideoTracks()[0];

    if (!nextCameraTrack) {
      throw new Error("Camera not available.");
    }

    await replaceOutgoingVideoTrack(nextCameraTrack);
    updateCameraPreviewTrack(nextCameraTrack.clone());
    displayStreamRef.current = null;
    setIsScreenSharing(false);
  }

  async function handleToggleScreenShare() {
    if (!canScreenShare || !activeCall || activeCall.callMode !== "video") {
      return;
    }

    setCallError("");

    try {
      if (isScreenSharing) {
        await switchBackToCamera();
        return;
      }

      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        audio: false,
        video: true,
      });
      const displayTrack = displayStream.getVideoTracks()[0];

      if (!displayTrack) {
        return;
      }

      displayTrack.onended = () => {
        void switchBackToCamera().catch(() => null);
      };

      displayStreamRef.current = displayStream;
      await replaceOutgoingVideoTrack(displayTrack, "screen");
      setIsScreenSharing(true);
    } catch {
      setCallError("Could not start screen share.");
    }
  }

  function getPreviewCornerClasses(corner: PreviewCorner) {
    if (corner === "top-left") {
      return "left-6 top-6 sm:left-8 sm:top-8";
    }

    if (corner === "top-right") {
      return "right-6 top-6 sm:right-8 sm:top-8";
    }

    if (corner === "bottom-left") {
      return "bottom-6 left-6 sm:bottom-8 sm:left-8";
    }

    return "bottom-6 right-6 sm:bottom-8 sm:right-8";
  }

  function handlePreviewPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    previewDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePreviewPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (previewDragRef.current.pointerId !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - previewDragRef.current.startX;
    const deltaY = event.clientY - previewDragRef.current.startY;

    previewDragRef.current.pointerId = null;

    if (Math.abs(deltaX) < 8 && Math.abs(deltaY) < 8) {
      return;
    }

    const stageRect = callStageRef.current?.getBoundingClientRect();

    if (!stageRect) {
      return;
    }

    const relativeX = event.clientX - stageRect.left;
    const relativeY = event.clientY - stageRect.top;
    const horizontal = relativeX < stageRect.width / 2 ? "left" : "right";
    const vertical = relativeY < stageRect.height / 2 ? "top" : "bottom";

    setPreviewCorner(`${vertical}-${horizontal}` as PreviewCorner);
  }

  function renderUsersList() {
    if (users.length === 0) {
      return <span className="text-sm text-stone-400">No one has joined yet.</span>;
    }

    return users.map((user) => (
      <div
        key={user.name}
        className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/6 px-3 py-2 text-sm text-stone-200"
      >
        <span>{user.name}</span>
        <span className="flex items-center gap-2 text-xs text-stone-400">
          <span className={`h-2.5 w-2.5 rounded-full ${user.online ? "bg-emerald-400" : "bg-rose-400"}`} />
          {user.online ? "Online" : "Offline"}
        </span>
      </div>
    ));
  }

  function renderCallAction(message: ChatMessage) {
    if (!currentUser || !message.callId || message.type !== "call_invite") {
      return null;
    }

    const isCreator = message.creatorId === currentUser.id;
    const canJoinPending = message.status === "pending" && !isCreator;
    const canJoinActive =
      message.status === "active" &&
      (message.creatorId === currentUser.id || message.participantId === currentUser.id);

    if (message.status === "ended") {
      return <span className="text-xs text-stone-400">Call ended</span>;
    }

    if (isCreator && message.status === "pending") {
      return <span className="text-xs text-stone-300">Waiting for someone to connect</span>;
    }

    if (!canJoinPending && !canJoinActive) {
      return null;
    }

    return (
      <button
        className="rounded-xl bg-emerald-400 px-3 py-2 text-xs font-medium text-[#06221c] transition hover:bg-emerald-300"
        onClick={() => void handleConnectCall(message)}
        type="button"
      >
        {message.status === "active" ? "Join call" : "Connect"}
      </button>
    );
  }

  const activeCallName = activeCall
    ? activeCall.role === "caller"
      ? activeCall.participantName ?? "Waiting for participant"
      : activeCall.creatorName
    : "Unknown";
  const activeCallLabel = activeCall?.callMode === "audio" ? "Audio call" : "Video call";

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#0f2d27_0%,#0a1716_16%,#081111_100%)] px-0 py-0 text-stone-100 sm:px-4 sm:py-4 lg:px-6 lg:py-6">
      <section className="mx-auto grid min-h-[100dvh] w-full max-w-6xl gap-0 sm:min-h-[calc(100dvh-2rem)] sm:gap-3 lg:min-h-[calc(100vh-3rem)] lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-4">
        <aside className="hidden rounded-[24px] border border-white/10 bg-white/6 p-4 backdrop-blur sm:p-5 lg:block lg:rounded-[28px]">
          <p className="text-[11px] uppercase tracking-[0.28em] text-emerald-200/70">Redis Chat</p>
          <h1 className="mt-2 font-serif text-2xl text-white sm:mt-3 sm:text-3xl">Simple team room</h1>
          <p className="mt-2 text-sm leading-6 text-stone-300 sm:mt-3">Join, chat, and start a call.</p>

          <div className="mt-5 rounded-3xl border border-white/10 bg-black/20 p-4 sm:mt-8">
            <p className="text-xs uppercase tracking-[0.24em] text-stone-400">You</p>
            <p className="mt-2 text-lg text-white">{currentUser ? currentUser.name : "Not joined yet"}</p>
          </div>

          <div className="mt-4 rounded-3xl border border-white/10 bg-black/20 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.24em] text-stone-400">All users</p>
              <span className="rounded-full bg-emerald-400/12 px-2 py-1 text-xs text-emerald-200">
                {users.length}
              </span>
            </div>
            <div className="mt-3 space-y-2">{renderUsersList()}</div>
          </div>
        </aside>

        <section className="relative flex h-[100dvh] min-h-[100dvh] flex-col overflow-hidden bg-[#0b1413] sm:h-[54dvh] sm:min-h-[54dvh] sm:rounded-[24px] sm:border sm:border-white/8 sm:bg-[#071312]/90 sm:shadow-[0_30px_80px_rgba(0,0,0,0.35)] lg:h-[70vh] lg:min-h-[70vh] lg:rounded-[28px]">
          <div className="z-20 shrink-0 border-b border-white/5 bg-[#10211f] px-3 py-2.5 sm:border-white/10 sm:bg-transparent sm:px-5 sm:py-4">
            {currentUser ? (
              <div className="flex items-center justify-between gap-3">
                <div>
                    <p className="text-[10px] uppercase tracking-[0.22em] text-stone-400 sm:text-[11px] sm:tracking-[0.24em]">
                      Live chat
                    </p>
                    <p className="mt-0.5 text-[12px] text-stone-300 sm:mt-1 sm:text-sm sm:text-stone-200">
                      {currentUser.name}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    aria-label={refreshingMessages ? "Refreshing messages" : "Refresh messages"}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white/6 text-stone-100 transition hover:bg-white/10 disabled:opacity-50"
                    disabled={refreshingMessages}
                    onClick={() => void handleManualRefresh()}
                    title="Refresh messages"
                    type="button"
                  >
                    <RefreshIcon />
                  </button>
                  <button
                    aria-label={pollingEnabled ? "Turn polling off" : "Turn polling on"}
                    className={`flex h-8 w-8 items-center justify-center rounded-full transition ${
                      pollingEnabled
                        ? "bg-emerald-400/14 text-emerald-200 hover:bg-emerald-400/22"
                        : "bg-white/6 text-stone-200 hover:bg-white/10"
                    }`}
                    onClick={() => {
                      setPollingEnabled((current) => !current);
                    }}
                    title={pollingEnabled ? "Polling on" : "Polling off"}
                    type="button"
                  >
                    <ToggleIcon />
                  </button>
                  <button
                    aria-label="Start audio call"
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-400/14 text-sky-200 transition hover:bg-sky-400/22 disabled:opacity-50"
                    disabled={Boolean(activeCall)}
                    onClick={() => void handleStartCall("audio")}
                    type="button"
                  >
                    <AudioCallIcon />
                  </button>
                  <button
                    aria-label="Start video call"
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-400/14 text-emerald-200 transition hover:bg-emerald-400/22 disabled:opacity-50"
                    disabled={Boolean(activeCall)}
                    onClick={() => void handleStartCall("video")}
                    type="button"
                  >
                    <VideoIcon />
                  </button>
                  <button
                    aria-label="Open users menu"
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white/6 text-stone-100 lg:hidden"
                    onClick={() => {
                      setMobileMenuOpen(true);
                    }}
                    type="button"
                  >
                    <MenuIcon />
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-8 sm:h-10" />
            )}

            {joinError ? <p className="mt-3 text-sm text-rose-300">{joinError}</p> : null}
            {sendError ? <p className="mt-3 text-sm text-rose-300">{sendError}</p> : null}
            {callError ? <p className="mt-3 text-sm text-rose-300">{callError}</p> : null}
          </div>

          <div
            ref={listRef}
            className="min-h-0 flex-1 space-y-1.5 overflow-y-auto bg-[#0e1716] px-2 py-2.5 pb-20 sm:space-y-3 sm:bg-transparent sm:px-5 sm:py-5 sm:pb-5"
          >
            {messages.length > 0 ? (
              messages.map((message) =>
                message.type === "system" ? (
                  <div key={message.id} className="flex justify-center py-1">
                    <div className="rounded-full bg-white/6 px-2.5 py-1 text-[10px] font-medium text-stone-400 sm:px-3 sm:text-[11px]">
                      {message.text}
                    </div>
                  </div>
                ) : message.type === "call_invite" ? (
                  <div key={message.id} className="flex justify-center py-1.5">
                    <div className="w-full max-w-sm rounded-[18px] border border-white/8 bg-white/6 px-4 py-3 text-center">
                      <p className="text-sm text-white">{message.text}</p>
                      <p className="mt-1 text-[11px] text-stone-400">
                        {message.status === "active"
                          ? `${message.callMode === "audio" ? "Audio" : "Video"} call is live`
                          : "Tap below to connect"}
                      </p>
                      <div className="mt-3 flex items-center justify-center">{renderCallAction(message)}</div>
                    </div>
                  </div>
                ) : (
                  <div
                    key={message.id}
                    className={`flex w-full ${message.userId === currentUser?.id ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`flex max-w-[97%] items-end gap-1 sm:max-w-[80%] sm:gap-2 ${
                        message.userId === currentUser?.id ? "flex-row-reverse" : "flex-row"
                      }`}
                    >
                      <div
                        className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold sm:mt-0 sm:h-8 sm:w-8 sm:text-xs ${getAvatarTone(
                          message.name
                        )}`}
                      >
                        {getAvatarLetter(message.name)}
                      </div>
                      <article
                        className={`w-auto max-w-[90%] rounded-[15px] px-2.5 py-2 sm:max-w-xl sm:rounded-3xl sm:px-4 sm:py-3 ${
                          message.userId === currentUser?.id
                            ? "bg-emerald-300 text-[#07211d]"
                            : "bg-white/8 text-stone-100"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 text-[10px] leading-none sm:gap-3 sm:text-xs">
                          <span className="font-medium opacity-85">{message.name}</span>
                          <span
                            className={`${message.userId === currentUser?.id ? "text-[#124c43]" : "text-stone-400"} opacity-80`}
                          >
                            {formatTime(message.timestamp)}
                          </span>
                        </div>
                        <p className="mt-1 whitespace-pre-wrap break-words text-[13px] leading-5 sm:mt-2 sm:text-sm sm:leading-6">
                          {message.text}
                        </p>
                      </article>
                    </div>
                  </div>
                )
              )
            ) : (
              <div className="flex h-full min-h-[280px] items-center justify-center rounded-[24px] border border-dashed border-white/10 bg-black/10 text-sm text-stone-400">
                No messages yet. Join and say hello.
              </div>
            )}
          </div>

          {currentUser ? (
            <div className="z-20 mt-auto shrink-0 border-t border-white/5 bg-[#10211f] px-2 py-2 pb-[calc(0.625rem+env(safe-area-inset-bottom))] sm:border-white/10 sm:bg-[#091615]/95 sm:px-5 sm:py-4 sm:pb-4">
              <form className="flex items-end gap-2" onSubmit={(event) => void handleSend(event)}>
                <input
                  ref={draftInputRef}
                  autoComplete="off"
                  className="h-10 flex-1 rounded-full bg-[#1b2d2a] px-3.5 text-sm text-white outline-none placeholder:text-stone-500 sm:h-12 sm:rounded-[22px] sm:border sm:border-white/10 sm:bg-black/25 sm:px-4"
                  enterKeyHint="send"
                  inputMode="text"
                  onChange={(event) => {
                    setDraft(event.target.value);
                  }}
                  onFocus={handleDraftFocus}
                  placeholder={`Message as ${currentUser.name}`}
                  type="text"
                  value={draft}
                />
                <button
                  aria-label={sending ? "Sending message" : "Send message"}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-400 text-[#05211d] transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60 sm:h-12 sm:w-12"
                  disabled={sending || !draft.trim()}
                  type="submit"
                >
                  <SendIcon />
                </button>
              </form>
            </div>
          ) : null}

          {activeCall ? (
            <div className="absolute inset-0 z-30 overflow-hidden bg-[linear-gradient(180deg,#173c34_0%,#10231f_24%,#081111_100%)]">
              <audio ref={remoteAudioRef} autoPlay playsInline />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#2b6a5d_0%,transparent_36%)] opacity-80" />
              <div className="relative flex h-full min-h-0 flex-col overflow-hidden">
                <div className="flex items-start justify-between px-5 pb-2 pt-5 text-white sm:px-7 sm:pb-3 sm:pt-6">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-full text-sm font-semibold shadow-[0_10px_24px_rgba(0,0,0,0.25)] ${getAvatarTone(
                        activeCall.role === "caller"
                          ? activeCall.participantName ?? activeCall.creatorName
                          : activeCall.creatorName
                      )}`}
                    >
                      {getAvatarLetter(
                        activeCall.role === "caller"
                          ? activeCall.participantName ?? activeCall.creatorName
                          : activeCall.creatorName
                      )}
                    </div>
                    <div>
                      <p className="text-lg font-medium text-white">
                        {activeCallName}
                      </p>
                      <p className="mt-0.5 text-sm text-white/70">
                        {activeCallLabel}
                        {" • "}
                        {activeCall.status === "calling"
                          ? "Calling..."
                          : activeCall.status === "ended"
                            ? "Call ended"
                            : activeCall.status === "connected"
                              ? "Connected"
                              : "Connecting..."}
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  ref={callStageRef}
                  className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-4 pb-24 sm:px-6 sm:pb-28"
                >
                  {activeCall.callMode === "video" ? (
                    <>
                      <div className="relative flex h-full max-h-[min(50vh,340px)] w-full max-w-[min(92vw,920px)] items-center justify-center overflow-hidden rounded-[28px] bg-black/45 ring-1 ring-white/8 sm:max-h-[min(56vh,430px)] md:max-h-[min(60vh,500px)]">
                        <video
                          ref={remoteVideoRef}
                          autoPlay
                          className="h-full w-full bg-black object-contain object-center"
                          muted
                          playsInline
                        />
                        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/35 to-transparent" />
                        <div className="absolute bottom-4 left-4 rounded-full bg-black/35 px-3 py-1.5 text-sm text-white/90 backdrop-blur">
                          {activeCallName}
                        </div>
                      </div>

                      <div
                        className={`absolute z-10 w-20 touch-none overflow-hidden rounded-[18px] bg-black/55 shadow-[0_18px_40px_rgba(0,0,0,0.35)] ring-1 ring-white/10 transition-[top,right,bottom,left] duration-200 sm:w-28 md:w-36 ${getPreviewCornerClasses(
                          previewCorner
                        )}`}
                        onPointerDown={handlePreviewPointerDown}
                        onPointerUp={handlePreviewPointerUp}
                      >
                        <video
                          ref={localVideoRef}
                          autoPlay
                          className={`aspect-[3/4] w-full bg-black object-cover ${cameraFacingMode === "user" ? "scale-x-[-1]" : ""}`}
                          muted
                          playsInline
                        />
                        <div className="border-t border-white/8 px-3 py-2 text-xs text-white/85">You</div>
                      </div>
                    </>
                  ) : (
                    <div className="flex w-full max-w-md flex-col items-center justify-center rounded-[32px] border border-white/10 bg-black/25 px-8 py-10 text-center shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
                      <div
                        className={`flex h-28 w-28 items-center justify-center rounded-full text-4xl font-semibold shadow-[0_14px_40px_rgba(0,0,0,0.28)] ${getAvatarTone(
                          activeCallName
                        )}`}
                      >
                        {getAvatarLetter(activeCallName)}
                      </div>
                      <p className="mt-6 text-2xl font-medium text-white">{activeCallName}</p>
                      <p className="mt-2 text-sm text-white/70">
                        {activeCall.status === "calling"
                          ? "Calling..."
                          : activeCall.status === "ended"
                            ? "Call ended"
                            : activeCall.status === "connected"
                              ? "Voice call connected"
                              : "Connecting..."}
                      </p>
                    </div>
                  )}
                </div>

                <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
                  {activeCall.callMode === "video" && canScreenShare ? (
                    <button
                      aria-label={isScreenSharing ? "Stop screen share" : "Start screen share"}
                      className={`flex h-12 w-12 items-center justify-center rounded-full text-white shadow-[0_18px_40px_rgba(0,0,0,0.28)] transition sm:h-14 sm:w-14 ${
                        isScreenSharing ? "bg-emerald-500/70 hover:bg-emerald-500/80" : "bg-white/10 hover:bg-white/16"
                      }`}
                      onClick={() => void handleToggleScreenShare()}
                      type="button"
                    >
                      <ScreenShareIcon />
                    </button>
                  ) : null}
                  <button
                    aria-label={soundMuted ? "Turn sound on" : "Mute sound"}
                    className={`flex h-12 w-12 items-center justify-center rounded-full text-white shadow-[0_18px_40px_rgba(0,0,0,0.28)] transition sm:h-14 sm:w-14 ${
                      soundMuted ? "bg-white/14 hover:bg-white/20" : "bg-white/10 hover:bg-white/16"
                    }`}
                    onClick={toggleSound}
                    type="button"
                  >
                    {soundMuted ? <SoundOffIcon /> : <SoundOnIcon />}
                  </button>
                  <button
                    aria-label={micMuted ? "Unmute microphone" : "Mute microphone"}
                    className={`flex h-12 w-12 items-center justify-center rounded-full text-white shadow-[0_18px_40px_rgba(0,0,0,0.28)] transition sm:h-14 sm:w-14 ${
                      micMuted ? "bg-white/14 hover:bg-white/20" : "bg-white/10 hover:bg-white/16"
                    }`}
                    onClick={toggleMute}
                    type="button"
                  >
                    {micMuted ? <MicOffIcon /> : <MicOnIcon />}
                  </button>
                  <button
                    aria-label={activeCall.status === "ended" ? "Close call window" : "End call"}
                    className="flex h-14 w-14 items-center justify-center rounded-full bg-[#ff4b5c] text-white shadow-[0_18px_40px_rgba(255,75,92,0.32)] transition hover:bg-[#ff6070] sm:h-16 sm:w-16"
                    onClick={() => void handleLeaveCall()}
                    type="button"
                  >
                    <EndCallIcon />
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </section>

        {currentUser ? (
          <div
            className={`fixed inset-0 z-40 bg-black/45 transition-opacity duration-200 lg:hidden ${
              mobileMenuOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
            }`}
            onClick={() => {
              setMobileMenuOpen(false);
            }}
          >
            <aside
              aria-label="Users sidebar"
              className={`absolute right-0 top-0 flex h-full w-[84vw] max-w-sm flex-col bg-[#10211f] p-4 shadow-[-24px_0_60px_rgba(0,0,0,0.35)] transition-transform duration-200 ${
                mobileMenuOpen ? "translate-x-0" : "translate-x-full"
              }`}
              onClick={(event) => {
                event.stopPropagation();
              }}
            >
              <div className="flex items-center justify-between border-b border-white/8 pb-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-stone-400">All users</p>
                  <p className="mt-1 text-sm text-stone-200">{users.length} total</p>
                </div>
                <button
                  aria-label="Close users menu"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/6 text-stone-200"
                  onClick={() => {
                    setMobileMenuOpen(false);
                  }}
                  type="button"
                >
                  <CloseIcon />
                </button>
              </div>

              <Link
                className="mt-4 flex items-center gap-3 rounded-[22px] border border-white/10 bg-white/6 px-4 py-3 text-stone-100 transition hover:bg-white/10"
                href="/profile"
                onClick={() => {
                  setMobileMenuOpen(false);
                }}
              >
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold ${getAvatarTone(
                    currentUser.name
                  )}`}
                >
                  {getAvatarLetter(currentUser.name)}
                </div>
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-[0.22em] text-stone-400">Profile</p>
                  <p className="mt-1 truncate text-sm text-white">{currentUser.name}</p>
                </div>
              </Link>

              <div className="mt-4 space-y-2 overflow-y-auto">{renderUsersList()}</div>
            </aside>
          </div>
        ) : null}

        {!currentUser ? (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#081111]/86 px-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-[#10211f] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
              <p className="text-[11px] uppercase tracking-[0.28em] text-emerald-200/70">Welcome</p>
              <h2 className="mt-3 text-3xl font-semibold text-white">Join the chat</h2>
              <p className="mt-2 text-sm leading-6 text-stone-300">
                Enter your name to start chatting with everyone in the room.
              </p>

              <form className="mt-6 flex flex-col gap-3" onSubmit={(event) => void handleJoin(event)}>
                <input
                  autoFocus
                  className="h-12 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-white outline-none placeholder:text-stone-500"
                  onChange={(event) => {
                    setName(event.target.value);
                  }}
                  placeholder="Your name"
                  value={name}
                />
                <button
                  className="h-12 rounded-2xl bg-emerald-400 px-5 text-sm font-medium text-[#05211d] transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={joining || !name.trim()}
                  type="submit"
                >
                  {joining ? "Joining..." : "Continue"}
                </button>
              </form>
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
