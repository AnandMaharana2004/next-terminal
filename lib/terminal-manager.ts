import { randomUUID } from "node:crypto";
import pty, { type IPty } from "node-pty";

const DEFAULT_SHELL = process.env.SHELL || "/usr/bin/bash";
const SESSION_TTL_MS = 30 * 60 * 1000;
const MAX_BUFFER_LENGTH = 200000;

type TerminalEvent =
  | {
      type: "output";
      data: string;
    }
  | {
      type: "exit";
      exitCode: number;
    };

type TerminalListener = (event: TerminalEvent) => void;

const PROMPT = "\\[\\e[01;32m\\]\\u@\\h\\[\\e[00m\\]:\\[\\e[01;34m\\]\\w\\[\\e[00m\\]\\$ ";

class TerminalSession {
  readonly id = randomUUID();
  private readonly pty: IPty;
  private readonly listeners = new Map<number, TerminalListener>();
  private nextListenerId = 0;
  private idleTimer: NodeJS.Timeout | undefined;
  private closed = false;
  private exitCode: number | null = null;
  private buffer = "";

  constructor() {
    this.pty = pty.spawn(DEFAULT_SHELL, ["--noprofile", "--norc", "-i"], {
      cols: 120,
      rows: 32,
      cwd: process.cwd(),
      env: {
        ...process.env,
        COLORTERM: "truecolor",
        LANG: "en_US.UTF-8",
        LC_ALL: "en_US.UTF-8",
        PROMPT_COMMAND: "",
        PS1: PROMPT,
        TERM: "xterm-256color",
      },
      name: "xterm-256color",
    });

    this.pty.onData((data) => {
      this.touch();
      this.pushOutput(data);
    });

    this.pty.onExit(({ exitCode }) => {
      this.closed = true;
      this.exitCode = exitCode;
      this.emit({
        type: "exit",
        exitCode,
      });
      this.clearIdleTimer();
    });

    this.touch();
  }

  getInitialBuffer() {
    this.touch();
    return this.buffer;
  }

  write(input: string) {
    if (this.closed) {
      return;
    }

    this.touch();
    this.pty.write(input);
  }

  resize(cols: number, rows: number) {
    if (this.closed) {
      return;
    }

    const safeCols = Math.max(20, Math.floor(cols));
    const safeRows = Math.max(5, Math.floor(rows));

    this.touch();
    this.pty.resize(safeCols, safeRows);
  }

  subscribe(listener: TerminalListener) {
    const id = this.nextListenerId;
    this.nextListenerId += 1;
    this.listeners.set(id, listener);
    this.touch();

    return () => {
      this.listeners.delete(id);
    };
  }

  dispose() {
    if (this.closed) {
      return;
    }

    this.closed = true;
    this.clearIdleTimer();
    this.pty.kill();
  }

  private pushOutput(data: string) {
    this.buffer += data;

    if (this.buffer.length > MAX_BUFFER_LENGTH) {
      this.buffer = this.buffer.slice(this.buffer.length - MAX_BUFFER_LENGTH);
    }

    this.emit({
      type: "output",
      data,
    });
  }

  private emit(event: TerminalEvent) {
    for (const listener of this.listeners.values()) {
      listener(event);
    }
  }

  private touch() {
    this.clearIdleTimer();
    this.idleTimer = setTimeout(() => {
      this.dispose();
    }, SESSION_TTL_MS);
  }

  private clearIdleTimer() {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = undefined;
    }
  }
}

type TerminalStore = Map<string, TerminalSession>;

const globalForTerminal = globalThis as typeof globalThis & {
  __terminalStore?: TerminalStore;
};

const sessions = globalForTerminal.__terminalStore ?? new Map<string, TerminalSession>();

if (!globalForTerminal.__terminalStore) {
  globalForTerminal.__terminalStore = sessions;
}

export function createTerminalSession() {
  const session = new TerminalSession();
  sessions.set(session.id, session);
  return session;
}

export function getTerminalSession(id: string) {
  return sessions.get(id) ?? null;
}

export function disposeTerminalSession(id: string) {
  const session = sessions.get(id);

  if (!session) {
    return false;
  }

  session.dispose();
  sessions.delete(id);
  return true;
}
