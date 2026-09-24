import { subscribe } from "@/lib/engine/store";
export const dynamic = "force-dynamic";
/** GET /api/engine/stream — live engine events from any run in this process (server-sent events). */
export function GET() {
  const enc = new TextEncoder();
  let unsub = () => {};
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(enc.encode(`event: hello\ndata: ${JSON.stringify({ at: new Date().toISOString() })}\n\n`));
      unsub = subscribe((e) => { try { controller.enqueue(enc.encode(`event: engine\ndata: ${JSON.stringify(e)}\n\n`)); } catch { unsub(); } });
    },
    cancel() { unsub(); },
  });
  return new Response(stream, { headers: { "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive" } });
}
