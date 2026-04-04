import { isAdminAuthenticated } from "@/lib/admin-auth";
import { deleteUserAndMessages } from "@/lib/chat";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function DELETE(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { name?: unknown };
  const name = typeof body.name === "string" ? body.name : "";

  if (!name.trim()) {
    return Response.json({ error: "User name is required." }, { status: 400 });
  }

  await deleteUserAndMessages(name);

  return Response.json({ ok: true });
}
