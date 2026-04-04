import { getCurrentDirectory, isAuthenticated } from "@/lib/auth";
import { readdir } from "node:fs/promises";
import path from "node:path";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Match = {
  isDirectory: boolean;
  value: string;
};

function getLongestCommonPrefix(values: string[]) {
  if (values.length === 0) {
    return "";
  }

  let prefix = values[0];

  for (const value of values.slice(1)) {
    while (!value.startsWith(prefix) && prefix.length > 0) {
      prefix = prefix.slice(0, -1);
    }
  }

  return prefix;
}

function escapeForShell(value: string) {
  return value.replaceAll(/([\s"'\\()])/g, "\\$1");
}

function getTokenStartIndex(input: string) {
  for (let index = input.length - 1; index >= 0; index -= 1) {
    if (/\s/.test(input[index])) {
      return index + 1;
    }
  }

  return 0;
}

export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { input?: unknown };
  const input = typeof body.input === "string" ? body.input : "";
  const currentDirectory = await getCurrentDirectory();
  const tokenStart = getTokenStartIndex(input);
  const token = input.slice(tokenStart);

  const normalizedToken = token.startsWith("~/")
    ? path.join(process.env.HOME || currentDirectory, token.slice(2))
    : token;

  const tokenDirectoryPart = normalizedToken.includes("/")
    ? normalizedToken.slice(0, normalizedToken.lastIndexOf("/") + 1)
    : "";
  const tokenNamePart = normalizedToken.slice(tokenDirectoryPart.length);
  const directoryToScan = path.resolve(currentDirectory, tokenDirectoryPart || ".");

  try {
    const entries = await readdir(directoryToScan, { withFileTypes: true });
    const matches: Match[] = entries
      .filter((entry) => entry.name.startsWith(tokenNamePart))
      .map((entry) => ({
        isDirectory: entry.isDirectory(),
        value: `${tokenDirectoryPart}${entry.name}${entry.isDirectory() ? "/" : ""}`,
      }))
      .sort((left, right) => left.value.localeCompare(right.value));

    if (matches.length === 0) {
      return Response.json({
        completedInput: input,
        matches: [],
      });
    }

    const commonValue = getLongestCommonPrefix(matches.map((match) => match.value));
    const completedInput = `${input.slice(0, tokenStart)}${escapeForShell(commonValue)}`;

    return Response.json({
      completedInput,
      matches,
    });
  } catch {
    return Response.json({
      completedInput: input,
      matches: [],
    });
  }
}
