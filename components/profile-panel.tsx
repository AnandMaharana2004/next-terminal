"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

function getAvatarLetter(name: string) {
  return name.trim().charAt(0).toUpperCase() || "?";
}

export function ProfilePanel({ userName }: { userName: string | null }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    const confirmed = window.confirm(
      "Delete your account and all of your messages permanently?"
    );

    if (!confirmed) {
      return;
    }

    setDeleting(true);
    setError("");

    const response = await fetch("/api/profile/delete", {
      method: "POST",
    });

    setDeleting(false);

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setError(data.error ?? "Could not delete profile.");
      return;
    }

    router.push("/");
    router.refresh();
  }

  if (!userName) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#081111] px-4 py-8 text-stone-100">
        <section className="w-full max-w-md rounded-[28px] border border-white/10 bg-[#10211f] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
          <p className="text-sm text-stone-300">No active user session found.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#081111] px-4 py-8 text-stone-100">
      <section className="w-full max-w-lg rounded-[28px] border border-white/10 bg-[#10211f] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
        <p className="text-[11px] uppercase tracking-[0.28em] text-emerald-200/70">Profile</p>
        <div className="mt-6 flex items-center gap-4 rounded-[24px] border border-white/10 bg-black/20 p-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-300 text-lg font-semibold text-[#07211d]">
            {getAvatarLetter(userName)}
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-stone-400">Your account</p>
            <p className="mt-1 text-xl text-white">{userName}</p>
          </div>
        </div>

        <div className="mt-8 rounded-[24px] border border-rose-400/20 bg-rose-500/10 p-5">
          <p className="text-sm font-medium text-rose-100">Delete account</p>
          <p className="mt-2 text-sm leading-6 text-rose-100/75">
            This permanently removes your user and all of your messages from the chat.
          </p>
          <button
            className="mt-5 h-12 rounded-2xl bg-rose-400 px-5 text-sm font-medium text-rose-950 transition hover:bg-rose-300 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={deleting}
            onClick={() => void handleDelete()}
            type="button"
          >
            {deleting ? "Deleting..." : "Delete ID"}
          </button>
          {error ? <p className="mt-3 text-sm text-rose-200">{error}</p> : null}
        </div>
      </section>
    </main>
  );
}
