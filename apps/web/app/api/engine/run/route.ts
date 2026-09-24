import { NextResponse } from "next/server";
import { executeRun, getRun, type RunRequest } from "@/lib/engine/store";
import { authoriseIntent } from "@/lib/engine/governance";
export const dynamic = "force-dynamic";

/** POST /api/engine/run — executes a real decision cycle; streams engine events as they are emitted (SSE). `repeatOf` reuses a run's context snapshot. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as RunRequest & { stream?: boolean; repeatOf?: string };
  const auth = authoriseIntent("run_cycle", { seed: body.seed, budgetGbp: body.budgetGbp });
  if (auth.outcome.kind !== "allow") return NextResponse.json({ error: "not authorised", outcome: auth.outcome }, { status: 403 });
  const prev = body.repeatOf ? getRun(body.repeatOf) : undefined;
  const reqRun: RunRequest = prev ? { ...body, seed: prev.input.seed, budgetGbp: prev.input.budgetGbp, spec: prev.input.spec, benchmarks: prev.input.benchmarks, contextSnapshot: prev.context, label: `again: ${prev.label}` } : body;
  if (body.stream === false) { const run = await executeRun(reqRun); return NextResponse.json({ runId: run.id, durationMs: run.durationMs }); }
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (type: string, data: unknown) => controller.enqueue(enc.encode(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`));
      try { const run = await executeRun({ ...reqRun, onEvent: (e) => send("engine", e) }); send("done", { runId: run.id, durationMs: run.durationMs }); }
      catch (err) { send("error", { message: err instanceof Error ? err.message : String(err) }); }
      finally { controller.close(); }
    },
  });
  return new Response(stream, { headers: { "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive" } });
}
