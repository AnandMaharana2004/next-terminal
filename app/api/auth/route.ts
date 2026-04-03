import { clearAuthSession, createAuthSession, isAuthenticated, isPasswordValid } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return Response.json({
    authenticated: await isAuthenticated(),
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as { password?: unknown };
  const password = typeof body.password === "string" ? body.password : "";

  if (!isPasswordValid(password)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  await createAuthSession();

  return Response.json({ ok: true });
}

export async function DELETE() {
  await clearAuthSession();
  return Response.json({ ok: true });
}
