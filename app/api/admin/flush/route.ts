import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getRedis } from "@/lib/redis";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  if (!(await isAdminAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const redis = await getRedis();
  await redis.flushDb();

  return Response.json({ ok: true });
}
