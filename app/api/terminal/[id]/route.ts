import { isAuthenticated } from "@/lib/auth";
import { disposeTerminalSession, getTerminalSession } from "@/lib/terminal-manager";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: RouteContext<"/api/terminal/[id]">
) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const session = getTerminalSession(id);

  if (!session) {
    return Response.json({ error: "Session not found." }, { status: 404 });
  }

  const body = (await request.json()) as { input?: unknown };
  const input = typeof body.input === "string" ? body.input : "";

  session.write(input);

  return Response.json({ ok: true });
}

export async function PUT(
  request: Request,
  context: RouteContext<"/api/terminal/[id]">
) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const session = getTerminalSession(id);

  if (!session) {
    return Response.json({ error: "Session not found." }, { status: 404 });
  }

  const body = (await request.json()) as { cols?: unknown; rows?: unknown };
  const cols = typeof body.cols === "number" ? body.cols : 120;
  const rows = typeof body.rows === "number" ? body.rows : 32;

  session.resize(cols, rows);

  return Response.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  context: RouteContext<"/api/terminal/[id]">
) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const disposed = disposeTerminalSession(id);

  if (!disposed) {
    return Response.json({ error: "Session not found." }, { status: 404 });
  }

  return Response.json({ ok: true });
}
