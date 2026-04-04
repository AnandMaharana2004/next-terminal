"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

function TerminalFrame({ status }: { status: string }) {
  return (
    <main className="flex min-h-screen bg-[#050505] px-2 py-2 text-stone-100 sm:px-4 sm:py-4">
      <section className="mx-auto flex w-full max-w-7xl flex-1 flex-col overflow-hidden rounded-[10px] border border-white/10 bg-black shadow-[0_24px_80px_rgba(0,0,0,0.75)]">
        <div className="flex items-center justify-between border-b border-white/10 bg-[#2c0f27] px-4 py-2">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-[#ff5f56]" />
            <span className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
            <span className="h-3 w-3 rounded-full bg-[#27c93f]" />
          </div>
          <div className="font-mono text-[12px] text-white/85">
            anand@next-terminal: {status}
          </div>
          <div className="w-14" />
        </div>
        <div className="min-h-[72vh] flex-1 bg-black px-3 py-3 font-mono text-[14px] leading-[1.35] text-[#d1d5db] sm:px-4 sm:py-4 sm:text-[15px]">
          Booting browser shell...
        </div>
      </section>
    </main>
  );
}

const TerminalApp = dynamic(
  () => import("@/components/terminal-app").then((mod) => mod.TerminalApp),
  {
    ssr: false,
    loading: () => <TerminalFrame status="loading" />,
  }
);

export function TerminalPage({
  initialAuthenticated,
  initialDirectory,
}: {
  initialAuthenticated: boolean;
  initialDirectory: string;
}) {
  const [authenticated, setAuthenticated] = useState(initialAuthenticated);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    const response = await fetch("/api/auth", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password }),
    });

    setSubmitting(false);

    if (!response.ok) {
      setError("Wrong password.");
      return;
    }

    setPassword("");
    setAuthenticated(true);
  }

  if (!authenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050505] px-4 py-6 text-stone-100">
        <section className="w-full max-w-md overflow-hidden rounded-[10px] border border-white/10 bg-black shadow-[0_24px_80px_rgba(0,0,0,0.75)]">
          <div className="flex items-center justify-between border-b border-white/10 bg-[#2c0f27] px-4 py-2">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-[#ff5f56]" />
              <span className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
              <span className="h-3 w-3 rounded-full bg-[#27c93f]" />
            </div>
            <div className="font-mono text-[12px] text-white/85">
              anand@next-terminal: locked
            </div>
            <div className="w-14" />
          </div>

          <form className="space-y-4 p-5" onSubmit={(event) => void handleSubmit(event)}>
            <div className="font-mono text-sm text-stone-300">
              Enter terminal password to continue.
            </div>
            <div className="relative">
              <input
                autoFocus
                className="w-full rounded border border-white/15 bg-[#0b0b0b] px-3 py-2 pr-14 font-mono text-sm text-white outline-none ring-0 placeholder:text-stone-500"
                onChange={(event) => {
                  setPassword(event.target.value);
                }}
                placeholder="Password"
                type={showPassword ? "text" : "password"}
                value={password}
              />
              <button
                className="absolute inset-y-0 right-0 px-3 font-mono text-xs text-stone-300 transition hover:text-white"
                onClick={() => {
                  setShowPassword((current) => !current);
                }}
                type="button"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            {error ? <p className="font-mono text-xs text-red-400">{error}</p> : null}
            <button
              className="w-full rounded border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 font-mono text-sm text-emerald-200 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={submitting || password.length === 0}
              type="submit"
            >
              {submitting ? "Unlocking..." : "Unlock Terminal"}
            </button>
          </form>
        </section>
      </main>
    );
  }

  return <TerminalApp initialDirectory={initialDirectory} />;
}
