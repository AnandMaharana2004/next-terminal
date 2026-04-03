"use client";

import { useEffect, useRef, useState } from "react";
import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "xterm";

type StreamOutputMessage = {
  data: string;
};

type StreamExitMessage = {
  exitCode: number;
};

export function TerminalApp() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const pendingInputRef = useRef("");
  const flushInputPromiseRef = useRef<Promise<void> | null>(null);
  const resizeRequestRef = useRef<{ cols: number; rows: number } | null>(null);
  const resizePromiseRef = useRef<Promise<void> | null>(null);
  const [status, setStatus] = useState("connecting");

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const terminal = new Terminal({
      allowProposedApi: false,
      convertEol: false,
      cursorBlink: true,
      cursorStyle: "block",
      fontFamily: '"Ubuntu Mono", "Cascadia Mono", "JetBrains Mono", monospace',
      fontSize: 16,
      letterSpacing: 0,
      lineHeight: 1.2,
      rows: 32,
      scrollback: 5000,
      tabStopWidth: 8,
      theme: {
        background: "#000000",
        black: "#000000",
        blue: "#3465a4",
        brightBlack: "#555753",
        brightBlue: "#729fcf",
        brightCyan: "#34e2e2",
        brightGreen: "#8ae234",
        brightMagenta: "#ad7fa8",
        brightRed: "#ef2929",
        brightWhite: "#eeeeec",
        brightYellow: "#fce94f",
        cursor: "#f8f8f2",
        cyan: "#06989a",
        foreground: "#eeeeec",
        green: "#4e9a06",
        magenta: "#75507b",
        red: "#cc0000",
        selectionBackground: "#ffffff40",
        white: "#d3d7cf",
        yellow: "#c4a000",
      },
    });

    const fitAddon = new FitAddon();
    terminalRef.current = terminal;
    terminal.loadAddon(fitAddon);
    terminal.open(container);
    fitAddon.fit();
    terminal.focus();

    const flushResize = async () => {
      const sessionId = sessionIdRef.current;
      const resizeRequest = resizeRequestRef.current;

      if (!sessionId || !resizeRequest) {
        return;
      }

      resizeRequestRef.current = null;

      await fetch(`/api/terminal/${sessionId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(resizeRequest),
      });

      if (resizeRequestRef.current) {
        resizePromiseRef.current = flushResize();
        await resizePromiseRef.current;
      }
    };

    const queueResize = () => {
      resizeRequestRef.current = {
        cols: terminal.cols,
        rows: terminal.rows,
      };

      if (!resizePromiseRef.current) {
        resizePromiseRef.current = flushResize().finally(() => {
          resizePromiseRef.current = null;
        });
      }
    };

    const flushInput = async () => {
      const sessionId = sessionIdRef.current;

      if (!sessionId) {
        return;
      }

      const input = pendingInputRef.current;

      if (!input) {
        return;
      }

      pendingInputRef.current = "";

      await fetch(`/api/terminal/${sessionId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ input }),
      });

      if (pendingInputRef.current) {
        flushInputPromiseRef.current = flushInput();
        await flushInputPromiseRef.current;
      }
    };

    const queueInput = (input: string) => {
      pendingInputRef.current += input;

      if (!flushInputPromiseRef.current) {
        flushInputPromiseRef.current = flushInput().finally(() => {
          flushInputPromiseRef.current = null;
        });
      }
    };

    const inputDisposable = terminal.onData((data) => {
      queueInput(data);
    });

    resizeObserverRef.current = new ResizeObserver(() => {
      fitAddon.fit();
      queueResize();
    });
    resizeObserverRef.current.observe(container);

    async function startSession() {
      const response = await fetch("/api/terminal", {
        method: "POST",
      });

      if (!response.ok) {
        setStatus("unavailable");
        terminal.writeln("Unable to start terminal session.");
        return;
      }

      const session = (await response.json()) as { id: string };
      sessionIdRef.current = session.id;
      queueResize();

      const eventSource = new EventSource(`/api/terminal/${session.id}/stream`);
      eventSourceRef.current = eventSource;

      eventSource.addEventListener("output", (event) => {
        const payload = JSON.parse((event as MessageEvent<string>).data) as StreamOutputMessage;
        terminal.write(payload.data);
        setStatus("live");
      });

      eventSource.addEventListener("exit", (event) => {
        const payload = JSON.parse((event as MessageEvent<string>).data) as StreamExitMessage;
        setStatus(`exited (${payload.exitCode})`);
      });

      eventSource.onerror = () => {
        setStatus("disconnected");
      };
    }

    void startSession();

    return () => {
      inputDisposable.dispose();
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      eventSourceRef.current?.close();
      eventSourceRef.current = null;

      const sessionId = sessionIdRef.current;
      sessionIdRef.current = null;

      if (sessionId) {
        void fetch(`/api/terminal/${sessionId}`, {
          method: "DELETE",
        });
      }

      terminal.dispose();
      terminalRef.current = null;
    };
  }, []);

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

        <div className="flex flex-1 bg-black">
          <div ref={containerRef} className="min-h-[72vh] w-full px-1 py-1 sm:px-2 sm:py-2" />
        </div>
      </section>
    </main>
  );
}
