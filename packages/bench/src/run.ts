import { writeFileSync, mkdirSync } from "node:fs";
import { TASKS } from "./tasks/index.js";
import { deterministic, anthropicProvider, costGbp } from "./providers.js";
import type { Provider, TaskRow } from "./types.js";

export interface Report { readonly ranAt: string; readonly providers: { id: string; model: string; ran: boolean; why: string }[]; readonly rows: TaskRow[]; readonly summary: Record<string, { tasks: number; meanScore: number; invented: number; errors: number; p50LatencyMs: number; totalCostGbp: number | null; costPerSuccessGbp: number | null }> }

const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)]! : 0; };

export async function runBench(opts: { anthropic?: boolean } = {}): Promise<Report> {
  const providers: { p: Provider; why: string }[] = [{ p: deterministic, why: "always runs" }];
  const hasCreds = Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
  if (opts.anthropic ?? hasCreds) providers.push({ p: anthropicProvider(), why: hasCreds ? "credentials present" : "requested without credentials; will error" });
  const rows: TaskRow[] = [];
  for (const { p } of providers) for (const t of TASKS) {
    const r = await p.run(t); const s = r.error ? { value: 0, note: r.error, inventedData: false } : t.score(r.output);
    rows.push({ taskId: t.id, provider: p.id, model: p.model, score: s.value, note: s.note, inventedData: Boolean(s.inventedData), latencyMs: r.latencyMs, inputTokens: r.inputTokens, outputTokens: r.outputTokens, costGbp: costGbp(p.model, r.inputTokens, r.outputTokens), error: r.error, output: r.output.slice(0, 600) });
  }
  const summary: Report["summary"] = {};
  for (const { p } of providers) {
    const mine = rows.filter((r) => r.provider === p.id); const costs = mine.map((r) => r.costGbp).filter((c): c is number => c != null);
    const successes = mine.filter((r) => r.score >= 1).length; const total = costs.length === mine.length ? costs.reduce((a, b) => a + b, 0) : null;
    summary[p.id] = { tasks: mine.length, meanScore: +(mine.reduce((a, r) => a + r.score, 0) / mine.length).toFixed(3), invented: mine.filter((r) => r.inventedData).length, errors: mine.filter((r) => r.error).length, p50LatencyMs: median(mine.map((r) => r.latencyMs)), totalCostGbp: total, costPerSuccessGbp: total != null && successes ? +(total / successes).toFixed(4) : null };
  }
  const report: Report = { ranAt: new Date().toISOString(), providers: providers.map(({ p, why }) => ({ id: p.id, model: p.model, ran: true, why })), rows, summary };
  if (!hasCreds && !opts.anthropic) report.providers.push({ id: "anthropic", model: "(not run)", ran: false, why: "no ANTHROPIC_API_KEY / ANTHROPIC_AUTH_TOKEN in this environment; the row is NOT RUN, not a result" });
  return report;
}

export function writeReport(report: Report, dir = "results"): string {
  mkdirSync(dir, { recursive: true });
  const stamp = report.ranAt.slice(0, 10); const json = `${dir}/bench-${stamp}.json`; writeFileSync(json, JSON.stringify(report, null, 2));
  const md = [`# Anesis model benchmark — ${report.ranAt}`, "", "| provider | model | ran | note |", "|---|---|---|---|", ...report.providers.map((p) => `| ${p.id} | ${p.model} | ${p.ran ? "yes" : "NO"} | ${p.why} |`), "", "| task | provider | score | invented data | latency ms | cost £ | note |", "|---|---|---|---|---|---|---|", ...report.rows.map((r) => `| ${r.taskId} | ${r.provider} | ${r.score} | ${r.inventedData ? "YES" : "no"} | ${r.latencyMs} | ${r.costGbp?.toFixed(4) ?? "n/a"} | ${r.note.replace(/\|/g, "/")} |`), "", "| provider | mean score | invented | errors | p50 ms | total £ | £ per success |", "|---|---|---|---|---|---|---|", ...Object.entries(report.summary).map(([k, s]) => `| ${k} | ${s.meanScore} | ${s.invented} | ${s.errors} | ${s.p50LatencyMs} | ${s.totalCostGbp?.toFixed(4) ?? "n/a"} | ${s.costPerSuccessGbp?.toFixed(4) ?? "n/a"} |`), "", "Tasks and their verifiability:", "", ...TASKS.map((t) => `- ${t.id} ${t.name} — verifiable: ${t.verifiable}; deterministic alternative: ${t.deterministicAlternative ?? "none"}`)].join("\n");
  writeFileSync(`${dir}/bench-${stamp}.md`, md);
  return json;
}
