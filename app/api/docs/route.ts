import { openApiDocument } from "@/docs/openapi";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return Response.json(openApiDocument);
}
