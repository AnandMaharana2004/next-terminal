import { isAuthenticated } from "@/lib/auth";
import { createTerminalSession } from "@/lib/terminal-manager";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const session = createTerminalSession();

  return Response.json({
    id: session.id,
  });
}
