"use client";

import Link from "next/link";
import { startTransition, useEffect, useRef, useState } from "react";

type ChatUser = {
  id: string;
  name: string;
};

type ChatMessage = {
  id: string;
  name: string;
  text: string;
  timestamp: string;
  type: "message" | "system";
  userId?: string;
};

type MessagesResponse = {
  messages: ChatMessage[];
  user: ChatUser | null;
  users: Array<{
    name: string;
    online: boolean;
  }>;
};

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

export function ChatRoom({
  initialMessages,
  initialUser,
  initialUsers,
}: {
  initialMessages: ChatMessage[];
  initialUser: ChatUser | null;
  initialUsers: Array<{
    name: string;
    online: boolean;
  }>;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [users, setUsers] = useState(initialUsers);
  const [currentUser, setCurrentUser] = useState(initialUser);
  const [name, setName] = useState("");
  const [draft, setDraft] = useState("");
  const [joinError, setJoinError] = useState("");
  const [sendError, setSendError] = useState("");
  const [joining, setJoining] = useState(false);
  const [sending, setSending] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);
  const draftInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const list = listRef.current;

    if (!list) {
      return;
    }

    list.scrollTop = list.scrollHeight;
  }, [messages]);

  function handleDraftFocus() {
    window.setTimeout(() => {
      draftInputRef.current?.scrollIntoView({
        block: "nearest",
      });
    }, 150);
  }

  async function refreshMessages() {
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
  }

  useEffect(() => {
    void refreshMessages();

    const timer = window.setInterval(() => {
      void refreshMessages();
    }, 2_000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

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

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#0f2d27_0%,#0a1716_16%,#081111_100%)] px-0 py-0 text-stone-100 sm:px-4 sm:py-4 lg:px-6 lg:py-6">
      <section className="mx-auto grid min-h-[100dvh] w-full max-w-6xl gap-0 sm:min-h-[calc(100dvh-2rem)] sm:gap-3 lg:min-h-[calc(100vh-3rem)] lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-4">
        <aside className="hidden rounded-[24px] border border-white/10 bg-white/6 p-4 backdrop-blur sm:p-5 lg:block lg:rounded-[28px]">
          <p className="text-[11px] uppercase tracking-[0.28em] text-emerald-200/70">Redis Chat</p>
          <h1 className="mt-2 font-serif text-2xl text-white sm:mt-3 sm:text-3xl">Simple team room</h1>
          <p className="mt-2 text-sm leading-6 text-stone-300 sm:mt-3">
            Join with your name and the UI will poll for new messages every 2 seconds.
          </p>

          <div className="mt-5 rounded-3xl border border-white/10 bg-black/20 p-4 sm:mt-8">
            <p className="text-xs uppercase tracking-[0.24em] text-stone-400">You</p>
            <p className="mt-2 text-lg text-white">
              {currentUser ? currentUser.name : "Not joined yet"}
            </p>
          </div>

          <div className="mt-4 rounded-3xl border border-white/10 bg-black/20 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.24em] text-stone-400">All users</p>
              <span className="rounded-full bg-emerald-400/12 px-2 py-1 text-xs text-emerald-200">
                {users.length}
              </span>
            </div>
            <div className="mt-3 space-y-2">
              {renderUsersList()}
            </div>
          </div>
        </aside>

        <section className="relative flex min-h-[100svh] flex-col overflow-hidden bg-[#0b1413] sm:min-h-[54dvh] sm:rounded-[24px] sm:border sm:border-white/8 sm:bg-[#071312]/90 sm:shadow-[0_30px_80px_rgba(0,0,0,0.35)] lg:min-h-[70vh] lg:rounded-[28px]">
          <div className="border-b border-white/5 bg-[#10211f] px-3 py-2.5 sm:border-white/10 sm:bg-transparent sm:px-5 sm:py-4">
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
            ) : (
              <div className="h-8 sm:h-10" />
            )}

            {joinError ? <p className="mt-3 text-sm text-rose-300">{joinError}</p> : null}
            {sendError ? <p className="mt-3 text-sm text-rose-300">{sendError}</p> : null}
          </div>

          <div
            ref={listRef}
            className="flex-1 space-y-1.5 overflow-y-auto bg-[#0e1716] px-2 py-2.5 pb-20 sm:space-y-3 sm:bg-transparent sm:px-5 sm:py-5 sm:pb-5"
          >
            {messages.length > 0 ? (
              messages.map((message) =>
                message.type === "system" ? (
                  <div key={message.id} className="flex justify-center py-1">
                    <div className="rounded-full bg-white/6 px-2.5 py-1 text-[10px] font-medium text-stone-400 sm:px-3 sm:text-[11px]">
                      {message.text}
                    </div>
                  </div>
                ) : (
                  <div
                    key={message.id}
                    className={`flex w-full ${
                      message.userId === currentUser?.id ? "justify-end" : "justify-start"
                    }`}
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
            <div className="sticky bottom-0 z-20 border-t border-white/5 bg-[#10211f] px-2 py-2 pb-[calc(0.625rem+env(safe-area-inset-bottom))] sm:border-white/10 sm:bg-[#091615]/95 sm:px-5 sm:py-4 sm:pb-4">
              <form className="flex items-end gap-2" onSubmit={(event) => void handleSend(event)}>
                <input
                  ref={draftInputRef}
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
                  autoComplete="off"
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
