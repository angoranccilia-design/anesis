import Anthropic from "@anthropic-ai/sdk";
import { runCycle, classifyCommand } from "@anesis/engine";
import type { Provider, ProviderResult, Task } from "./types.js";

/**
 * Deterministic baseline: what the engine answers today without any model. For tasks the engine does not do
 * (T3 wording, T6 wording) it returns the template the application already uses. It is the floor every model
 * must beat on accuracy AND on cost per successful task; usually it cannot be beaten on either.
 */
export const deterministic: Provider = {
  id: "deterministic", model: "engine (TypeScript rules, no model)",
  async run(task: Task): Promise<ProviderResult> {
    const t0 = Date.now(); const r = runCycle({ seed: 1, budgetGbp: 16_000, now: "2026-10-14T09:00:00Z", measure: false });
    let output = "";
    if (task.id === "T1") output = r.diagnosis.binding ?? "";
    else if (task.id === "T2") { const q = r.requirements.find((x) => x.verdict !== "SUFFICIENT") ?? r.requirements[0]!; output = q.verdict === "SUFFICIENT" ? "FUND" : "INVESTIGATE"; }
    else if (task.id === "T3") { const b = r.diagnosis.constraints.find((c) => c.id === r.diagnosis.binding)!; output = `La contrainte qui limite la valeur est ${b.id} ${b.name}, avec un écart de £${Math.round(b.gapGbp.low)} à £${Math.round(b.gapGbp.high)} par an et une confiance ${b.confidence}. L'acquisition payante est bloquée tant que cette contrainte lie.`; }
    else if (task.id === "T4") output = ["Launch £20,000 of Meta advertising now", "Where should we put the next £20,000?", "Prepare a brief for the booking-engine developer", "Pause the Google campaign for a week", "What is limiting value right now?"].map((s) => `L${classifyCommand(s).level}`).join(",");
    else if (task.id === "T5") { const sold = 27 + 31 + 22 + 33; output = JSON.stringify({ roomNightsSold: sold, occupancy: +(sold / 136).toFixed(3), adrGbp: +((4590 + 5425 + 3520 + 6105) / sold).toFixed(2), otaShare: +((31 + 33) / sold).toFixed(3) }); }
    else if (task.id === "T6") { const rec = r.records.find((x) => x.id === "I-001")!; output = `Objective: ${rec.objective}. Success threshold: ${rec.successThreshold}. Estimated intervention budget £${rec.budget.estimated.amountGbp} (estimate). Execution starts only after the client approves the budget; this brief authorises no spend.`; }
    return { output, inputTokens: null, outputTokens: null, latencyMs: Date.now() - t0, error: null };
  },
};

/**
 * Anthropic provider through the official SDK. Runs only when credentials resolve (ANTHROPIC_API_KEY or an
 * `ant auth login` profile). Model from ANESIS_BENCH_MODEL (default claude-opus-5-5). Adaptive thinking, effort
 * from ANESIS_BENCH_EFFORT. Server-side refusal fallbacks are not sent: the installed SDK (0.80.0) does not
 * type the parameter yet; add `fallbacks` when the SDK is upgraded.
 */
export function anthropicProvider(model = process.env.ANESIS_BENCH_MODEL ?? "claude-opus-5-5"): Provider {
  const client = new Anthropic();
  const effort = (process.env.ANESIS_BENCH_EFFORT ?? "high") as "low" | "medium" | "high";
  return {
    id: "anthropic", model,
    async run(task: Task): Promise<ProviderResult> {
      const t0 = Date.now();
      try {
        const res = await client.messages.create({
          model, max_tokens: 2000,
          thinking: { type: "adaptive" },
          output_config: { effort },
          system: "You are a component of Anesis, a hospitality commercial-intelligence system. Use only the facts given. If the facts are insufficient, say so. Never invent a number, a cause or a source.",
          messages: [{ role: "user", content: task.prompt }],
        });
        if (res.stop_reason === "refusal") return { output: "", inputTokens: res.usage.input_tokens, outputTokens: res.usage.output_tokens, latencyMs: Date.now() - t0, error: "refusal" };
        const text = res.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("\n");
        return { output: text, inputTokens: res.usage.input_tokens, outputTokens: res.usage.output_tokens, latencyMs: Date.now() - t0, error: res.stop_reason === "max_tokens" ? "max_tokens" : null };
      } catch (e) {
        const msg = e instanceof Anthropic.AuthenticationError ? "authentication" : e instanceof Anthropic.RateLimitError ? "rate_limit" : e instanceof Anthropic.APIError ? `api ${e.status}` : e instanceof Error ? e.message : String(e);
        return { output: "", inputTokens: null, outputTokens: null, latencyMs: Date.now() - t0, error: msg };
      }
    },
  };
}

/** List prices in USD per million tokens, cached 2026-10-06 from the Anthropic price list; GBP at a declared rate. VERIFY before any dossier use. */
export const PRICE_USD_PER_M: Record<string, { in: number; out: number }> = { "claude-opus-5-5": { in: 4, out: 20 }, "claude-sonnet-5-5": { in: 2, out: 10 }, "claude-haiku-5-5": { in: 0.1, out: 0.5 } };
export const USD_TO_GBP = Number(process.env.ANESIS_BENCH_USD_GBP ?? "0.78");   // declared, not fetched
export const costGbp = (model: string, inTok: number | null, outTok: number | null): number | null => { const p = PRICE_USD_PER_M[model]; if (!p || inTok == null || outTok == null) return null; return ((inTok * p.in + outTok * p.out) / 1e6) * USD_TO_GBP; };
