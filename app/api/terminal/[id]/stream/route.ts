import { isAuthenticated } from "@/lib/auth";
import { getTerminalSession } from "@/lib/terminal-manager";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function encodeSsePayload(event: string, payload: object) {
  return `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
}

export async function GET(
  request: Request,
  context: RouteContext<"/api/terminal/[id]/stream">
) {
  if (!(await isAuthenticated())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const session = getTerminalSession(id);

  if (!session) {
    return Response.json({ error: "Session not found." }, { status: 404 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (event: string, payload: object) => {
        controller.enqueue(encoder.encode(encodeSsePayload(event, payload)));
      };

      const initialBuffer = session.getInitialBuffer();

      if (initialBuffer) {
        send("output", { data: initialBuffer });
      }

      const unsubscribe = session.subscribe((event) => {
        if (event.type === "output") {
          send("output", { data: event.data });
          return;
        }

        send("exit", { exitCode: event.exitCode });
      });

      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(": ping\n\n"));
      }, 15000);

      const cleanup = () => {
        clearInterval(heartbeat);
        unsubscribe();

        try {
          controller.close();
        } catch {}
      };

      request.signal.addEventListener("abort", cleanup, { once: true });
    },
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream",
    },
  });
}
