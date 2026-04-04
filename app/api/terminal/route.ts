import { getCurrentDirectory, isAuthenticated, setCurrentDirectory } from "@/lib/auth";
import { spawn } from "node:child_process";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PWD_MARKER = "__NEXT_TERMINAL_PWD__";

function runCommand(command: string, directory: string) {
  return new Promise<{
    exitCode: number;
    stderr: string;
    stdout: string;
  }>((resolve, reject) => {
    const shell = process.env.SHELL || "/usr/bin/bash";
    const child = spawn(
      shell,
      [
        "-lc",
        'cd "$NEXT_TERMINAL_CWD" 2>/dev/null || exit 1; eval "$NEXT_TERMINAL_COMMAND"; status=$?; printf "\\n' +
          PWD_MARKER +
          '%s" "$PWD"; exit $status',
      ],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          NEXT_TERMINAL_COMMAND: command,
          NEXT_TERMINAL_CWD: directory,
        },
      }
    );

    let stdout = "";
    let stderr = "";
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) {
        return;
      }

      settled = true;
      child.kill("SIGTERM");
      reject(
        Object.assign(new Error("Command timed out"), {
          code: 124,
          stderr,
          stdout,
        })
      );
    }, 30_000);

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });

    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });

    child.on("error", (error) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timer);
      reject(error);
    });

    child.on("close", (code) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timer);
      resolve({
        exitCode: code ?? 1,
        stderr,
        stdout,
      });
    });
  });
}

function extractDirectory(output: string) {
  const markerIndex = output.lastIndexOf(PWD_MARKER);

  if (markerIndex === -1) {
    return {
      currentDirectory: process.cwd(),
      output,
    };
  }

  const visibleOutput = output.slice(0, markerIndex).replace(/\n$/, "");
  const currentDirectory = output.slice(markerIndex + PWD_MARKER.length).trim() || process.cwd();

  return {
    currentDirectory,
    output: visibleOutput,
  };
}

export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { command?: unknown };
  const command = typeof body.command === "string" ? body.command.trim() : "";

  if (!command) {
    return Response.json({ error: "Command is required." }, { status: 400 });
  }

  const currentDirectory = await getCurrentDirectory();

  try {
    const result = await runCommand(command, currentDirectory);
    const parsed = extractDirectory(result.stdout);
    await setCurrentDirectory(parsed.currentDirectory);

    return Response.json({
      currentDirectory: parsed.currentDirectory,
      errorOutput: result.stderr,
      exitCode: result.exitCode,
      ok: result.exitCode === 0,
      output: parsed.output,
    });
  } catch (error) {
    const commandError = error as {
      code?: number;
      stdout?: string;
      stderr?: string;
    };
    const parsed = extractDirectory(commandError.stdout ?? "");
    await setCurrentDirectory(parsed.currentDirectory);

    return Response.json({
      currentDirectory: parsed.currentDirectory,
      ok: false,
      output: parsed.output,
      errorOutput: commandError.stderr ?? "",
      exitCode: commandError.code ?? 1,
    });
  }
}
