"use client";

import { useEffect, useRef, useState } from "react";

type CommandEntry = {
  command: string;
  directory: string;
  errorOutput: string;
  exitCode: number;
  id: string;
  output: string;
};

type CommandResponse = {
  currentDirectory: string;
  errorOutput: string;
  exitCode: number;
  ok: boolean;
  output: string;
};

type CompletionResponse = {
  completedInput: string;
  matches: Array<{
    isDirectory: boolean;
    value: string;
  }>;
};

const PROMPT_USER = "anand";
const PROMPT_HOST = "next-terminal";

function formatPromptPath(directory: string) {
  const projectRoot = "/home/anand/Programming/next-terminal";

  if (directory === projectRoot) {
    return "~";
  }

  if (directory.startsWith(`${projectRoot}/`)) {
    return `~/${directory.slice(projectRoot.length + 1)}`;
  }

  return directory;
}

export function TerminalApp({ initialDirectory }: { initialDirectory: string }) {
  const transcriptRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [command, setCommand] = useState("");
  const [history, setHistory] = useState<CommandEntry[]>([]);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState("ready");
  const [currentDirectory, setCurrentDirectory] = useState(initialDirectory);

  useEffect(() => {
    const node = transcriptRef.current;

    if (!node) {
      return;
    }

    node.scrollTop = node.scrollHeight;
  }, [command, history, running]);

  useEffect(() => {
    if (running) {
      return;
    }

    inputRef.current?.focus();
  }, [running]);

  async function autocompleteCommand() {
    if (running || command.trim().length === 0) {
      return;
    }

    const response = await fetch("/api/terminal/complete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ input: command }),
    });

    if (!response.ok) {
      return;
    }

    const result = (await response.json()) as CompletionResponse;

    if (result.completedInput && result.completedInput !== command) {
      setCommand(result.completedInput);
      return;
    }

    if (result.matches.length > 1) {
      setHistory((current) => [
        ...current,
        {
          command,
          directory: currentDirectory,
          errorOutput: "",
          exitCode: 0,
          id: `${Date.now()}-${current.length}`,
          output: result.matches.map((match) => match.value).join("    "),
        },
      ]);
    }
  }

  async function runCommand(rawCommand: string) {
    const trimmedCommand = rawCommand.trim();

    if (!trimmedCommand || running) {
      return;
    }

    if (trimmedCommand === "clear") {
      setHistory([]);
      setCommand("");
      setStatus("ready");
      return;
    }

    setRunning(true);
    setStatus("running");
    setCommand("");

    const response = await fetch("/api/terminal", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ command: trimmedCommand }),
    });

    if (!response.ok && response.status === 401) {
      setRunning(false);
      setStatus("locked");
      return;
    }

    const result = (await response.json()) as CommandResponse;
    setCurrentDirectory(result.currentDirectory ?? currentDirectory);

    setHistory((current) => [
      ...current,
      {
        command: trimmedCommand,
        directory: currentDirectory,
        errorOutput: result.errorOutput ?? "",
        exitCode: result.exitCode ?? 1,
        id: `${Date.now()}-${current.length}`,
        output: result.output ?? "",
      },
    ]);

    setRunning(false);
    setStatus("ready");
  }

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

        <div
          ref={transcriptRef}
          className="flex min-h-[72vh] flex-1 flex-col overflow-auto bg-black px-3 py-3 font-mono text-[14px] leading-[1.35] text-[#d1d5db] sm:px-4 sm:py-4 sm:text-[15px]"
          onClick={() => {
            inputRef.current?.focus();
          }}
        >
          {history.map((entry) => (
            <div key={entry.id} className="mb-3">
              <div className="flex flex-wrap items-end">
                <span className="text-[#84cc16]">{PROMPT_USER}</span>
                <span className="text-white">@</span>
                <span className="text-[#84cc16]">{PROMPT_HOST}</span>
                <span className="text-white">:</span>
                <span className="text-[#60a5fa]">
                  {formatPromptPath(entry.directory)}
                </span>
                <span className="mr-2 text-white">$</span>
                <span className="text-white">{entry.command}</span>
              </div>
              {entry.output ? (
                <pre className="whitespace-pre-wrap break-words text-[#d1d5db]">
                  {entry.output}
                </pre>
              ) : null}
              {entry.errorOutput ? (
                <pre className="whitespace-pre-wrap break-words text-[#f87171]">
                  {entry.errorOutput}
                </pre>
              ) : null}
              {entry.exitCode !== 0 ? (
                <p className="text-xs text-amber-300">exit code: {entry.exitCode}</p>
              ) : null}
            </div>
          ))}

          <form
            className="pt-1"
            onSubmit={(event) => {
              event.preventDefault();
              void runCommand(command);
            }}
          >
            <label className="flex flex-wrap items-center">
              <span className="text-[#84cc16]">{PROMPT_USER}</span>
              <span className="text-white">@</span>
              <span className="text-[#84cc16]">{PROMPT_HOST}</span>
              <span className="text-white">:</span>
              <span className="text-[#60a5fa]">{formatPromptPath(currentDirectory)}</span>
              <span className="mr-2 text-white">$</span>
              <input
                autoFocus
                className="min-w-[240px] flex-1 bg-transparent text-white outline-none"
                disabled={running}
                ref={inputRef}
                onKeyDown={(event) => {
                  if (event.key === "Tab") {
                    event.preventDefault();
                    void autocompleteCommand();
                  }
                }}
                onChange={(event) => {
                  setCommand(event.target.value);
                }}
                spellCheck={false}
                value={command}
              />
            </label>
          </form>
        </div>
      </section>
    </main>
  );
}
