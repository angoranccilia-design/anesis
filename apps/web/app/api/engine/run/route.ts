import { NextResponse } from "next/server";
import { executeRun, type RunRequest } from "@/lib/engine/store";
import { authoriseIntent } from "@/lib/engine/governance";

export const dynamic = "force-dynamic";

/**
 * POST /api/engine/run — executes a real decision cycle. Streams the engine's events as they are emitted
 * (server-sent events, real timestamps) and ends with the run id. Nothing is delayed or staged.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as RunRequest & { stream?: boolean };
  const auth = authoriseIntent("run_cycle", { seed: body.seed, budgetGbp: body.budgetGbp });
  if (auth.outcome.kind !== "allow") return NextResponse.json({ error: "not authorised", outcome: auth.outcome }, { status: 403 });
  if (body.stream === false) {
    const run = executeRun(body);
    return NextResponse.json({ runId: run.id, durationMs: run.durationMs });
  }
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const send = (type: string, data: unknown) => controller.enqueue(enc.encode(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`));
      try {
        const run = executeRun({ ...body, onEvent: (e) => send("engine", e) });
        send("done", { runId: run.id, durationMs: run.durationMs });
      } catch (err) {
        send("error", { message: err instanceof Error ? err.message : String(err) });
      } finally { controller.close(); }
    },
  });
  return new Response(stream, { headers: { "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive" } });
}
