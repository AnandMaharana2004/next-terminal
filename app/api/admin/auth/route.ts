import {
  clearAdminSession,
  createAdminSession,
  isAdminPasswordValid,
} from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as { password?: unknown };
  const password = typeof body.password === "string" ? body.password : "";

  if (!isAdminPasswordValid(password)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  await createAdminSession();

  return Response.json({ ok: true });
}

export async function DELETE() {
  await clearAdminSession();
  return Response.json({ ok: true });
}
