"use client";

import { useState } from "react";

type AdminUser = {
  name: string;
  online: boolean;
};

export function AdminPanel({
  authenticated,
  initialUsers,
}: {
  authenticated: boolean;
  initialUsers: AdminUser[];
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [flushing, setFlushing] = useState(false);
  const [flushMessage, setFlushMessage] = useState("");
  const [users, setUsers] = useState(initialUsers);
  const [deletingUser, setDeletingUser] = useState("");

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    const response = await fetch("/api/admin/auth", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password }),
    });

    setSubmitting(false);

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setError(data.error ?? "Wrong password.");
      return;
    }

    window.location.reload();
  }

  async function handleFlush() {
    const confirmed = window.confirm("This will wipe all Redis data for this project. Continue?");

    if (!confirmed) {
      return;
    }

    setFlushing(true);
    setFlushMessage("");
    setError("");

    const response = await fetch("/api/admin/flush", {
      method: "POST",
    });

    setFlushing(false);

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setError(data.error ?? "Could not flush Redis.");
      return;
    }

    setFlushMessage("Redis data cleared.");
  }

  async function handleLogout() {
    await fetch("/api/admin/auth", {
      method: "DELETE",
    });

    window.location.reload();
  }

  async function handleDeleteUser(name: string) {
    const confirmed = window.confirm(`Delete ${name} and all of their messages?`);

    if (!confirmed) {
      return;
    }

    setDeletingUser(name);
    setError("");
    setFlushMessage("");

    const response = await fetch("/api/admin/users", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name }),
    });

    setDeletingUser("");

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setError(data.error ?? "Could not delete user.");
      return;
    }

    setUsers((current) => current.filter((user) => user.name !== name));
  }

  if (!authenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#081111] px-4 py-8 text-stone-100">
        <section className="w-full max-w-md rounded-[28px] border border-white/10 bg-[#10211f] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
          <p className="text-[11px] uppercase tracking-[0.28em] text-emerald-200/70">Secret Admin</p>
          <h1 className="mt-3 text-3xl font-semibold text-white">Admin access</h1>
          <p className="mt-2 text-sm leading-6 text-stone-300">
            Enter the admin password to manage the chat database.
          </p>

          <form className="mt-6 space-y-4" onSubmit={(event) => void handleLogin(event)}>
            <input
              autoFocus
              className="h-12 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-white outline-none placeholder:text-stone-500"
              onChange={(event) => {
                setPassword(event.target.value);
              }}
              placeholder="Admin password"
              type="password"
              value={password}
            />
            {error ? <p className="text-sm text-rose-300">{error}</p> : null}
            <button
              className="h-12 w-full rounded-2xl bg-emerald-400 px-5 text-sm font-medium text-[#05211d] transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={submitting || !password}
              type="submit"
            >
              {submitting ? "Checking..." : "Enter admin"}
            </button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#081111] px-4 py-8 text-stone-100">
      <section className="w-full max-w-3xl rounded-[28px] border border-white/10 bg-[#10211f] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-emerald-200/70">Secret Admin</p>
            <h1 className="mt-3 text-3xl font-semibold text-white">Database controls</h1>
            <p className="mt-2 text-sm leading-6 text-stone-300">
              Use this page carefully. Flush will wipe all Redis data for the app.
            </p>
          </div>
          <button
            className="rounded-full border border-white/10 bg-white/6 px-3 py-2 text-xs text-stone-200"
            onClick={() => void handleLogout()}
            type="button"
          >
            Logout
          </button>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-white">Users</p>
                <p className="mt-1 text-sm text-stone-300">Delete a user and all their chat history.</p>
              </div>
              <span className="rounded-full bg-white/6 px-3 py-1 text-xs text-stone-300">{users.length}</span>
            </div>

            <div className="mt-5 space-y-3">
              {users.length > 0 ? (
                users.map((user) => (
                  <div
                    key={user.name}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-white/8 bg-white/6 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-white">{user.name}</p>
                      <p className="mt-1 flex items-center gap-2 text-xs text-stone-400">
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${
                            user.online ? "bg-emerald-400" : "bg-rose-400"
                          }`}
                        />
                        {user.online ? "Online" : "Offline"}
                      </p>
                    </div>
                    <button
                      className="rounded-xl bg-rose-400 px-3 py-2 text-xs font-medium text-rose-950 transition hover:bg-rose-300 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={deletingUser === user.name}
                      onClick={() => void handleDeleteUser(user.name)}
                      type="button"
                    >
                      {deletingUser === user.name ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-stone-400">No users found.</p>
              )}
            </div>
          </div>

          <div className="rounded-[24px] border border-rose-400/20 bg-rose-500/10 p-5">
            <p className="text-sm font-medium text-rose-100">Flush Redis database</p>
            <p className="mt-2 text-sm leading-6 text-rose-100/75">
              This removes chat messages, user presence, and stored user records.
            </p>
            <button
              className="mt-5 h-12 rounded-2xl bg-rose-400 px-5 text-sm font-medium text-rose-950 transition hover:bg-rose-300 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={flushing}
              onClick={() => void handleFlush()}
              type="button"
            >
              {flushing ? "Flushing..." : "Flush database"}
            </button>
            {error ? <p className="mt-3 text-sm text-rose-200">{error}</p> : null}
            {flushMessage ? <p className="mt-3 text-sm text-emerald-200">{flushMessage}</p> : null}
          </div>
        </div>
      </section>
    </main>
  );
}
