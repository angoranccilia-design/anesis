"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CycleResult, EngineEvent, EngineState, LearningRecord } from "@anesis/engine";
import { Core } from "./Core";
import { EvidenceInspector } from "./EvidenceInspector";
import { AskPanel } from "./AskPanel";
import Image from "next/image";

interface RunRecord { id: string; createdAt: string; label: string; durationMs: number; input: { seed: number; budgetGbp: number; spec?: Record<string, unknown>; benchmarks?: Record<string, number>; memoryUsed: number }; result: CycleResult; diff?: { field: string; a: string; b: string }[] }
interface RunSummary { id: string; createdAt: string; label: string; durationMs: number; summary: { binding: string | null; selected: string[]; assay: string; measurement: string | null; expectedValueGbp: number } }
type Ev = EngineEvent & { runId: string };

const gbp = (x: number) => `£${Math.round(x).toLocaleString("en-GB")}`;
const pct = (x: number, d = 0) => `${(x * 100).toFixed(d)} %`;

async function readSse(res: Response, onEvent: (type: string, data: unknown) => void) {
  const reader = res.body!.getReader(); const dec = new TextDecoder(); let buf = "";
  for (;;) {
    const { value, done } = await reader.read(); if (done) break;
    buf += dec.decode(value, { stream: true });
    let idx; while ((idx = buf.indexOf("\n\n")) >= 0) {
      const chunk = buf.slice(0, idx); buf = buf.slice(idx + 2);
      const type = /^event: (.*)$/m.exec(chunk)?.[1] ?? "message"; const data = /^data: (.*)$/m.exec(chunk)?.[1];
      if (data) onEvent(type, JSON.parse(data));
    }
  }
}

export function EngineConsole({ initial }: { initial: RunRecord | null }) {
  const [run, setRun] = useState<RunRecord | null>(initial);
  const [events, setEvents] = useState<Ev[]>(initial ? initial.result.events.map((e) => ({ ...e, runId: initial.id })) : []);
  const [state, setState] = useState<EngineState>(initial ? "IDLE" : "IDLE");
  const [running, setRunning] = useState(false);
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [memory, setMemory] = useState<LearningRecord[]>([]);
  const [inspect, setInspect] = useState<string | null>(null);
  const [compareWith, setCompareWith] = useState<string>("");
  const [pace, setPace] = useState<"instant" | "replay">("instant");
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [scenario, setScenario] = useState({ seed: 1, budgetGbp: 16000, convMobile: 0.0068, otaShare: 0.47, repeatRate: 0.09, ownerPlan: "I-004", benchConv: 0.012, useMemory: true });
  const streamRef = useRef<EventSource | null>(null);

  const refreshRuns = useCallback(async () => { const j = await (await fetch("/api/engine/runs")).json(); setRuns(j.runs); setMemory(j.memory); }, []);
  const loadRun = useCallback(async (id: string, compare?: string) => {
    const j = (await (await fetch(`/api/engine/runs/${id}${compare ? `?compare=${compare}` : ""}`)).json()) as RunRecord;
    setRun(j); setEvents(j.result.events.map((e) => ({ ...e, runId: j.id }))); setState("IDLE");
  }, []);
  useEffect(() => { void refreshRuns(); }, [refreshRuns]);

  // Live stream of engine events from this server process (real timestamps) — used for runs started elsewhere (e.g. by voice).
  useEffect(() => {
    const es = new EventSource("/api/engine/stream"); streamRef.current = es;
    es.addEventListener("engine", (m) => { const e = JSON.parse((m as MessageEvent).data) as Ev; if (!running) { setEvents((l) => (l.some((x) => x.runId === e.runId && x.seq === e.seq) ? l : [...l, e])); setState(e.state); } });
    return () => es.close();
  }, [running]);

  const startRun = useCallback(async (opts: { sameInputs?: boolean } = {}) => {
    setRunning(true); setEvents([]); setInspect(null);
    const body = opts.sameInputs && run
      ? { seed: run.input.seed, budgetGbp: run.input.budgetGbp, spec: run.input.spec, benchmarks: run.input.benchmarks, useMemory: run.input.memoryUsed > 0, label: `again: ${run.label}` }
      : { seed: scenario.seed, budgetGbp: scenario.budgetGbp, spec: { convMobile: scenario.convMobile, otaShare: scenario.otaShare, repeatRate: scenario.repeatRate, ownerPlan: scenario.ownerPlan || null }, benchmarks: { "conv.mobile.p50": scenario.benchConv }, useMemory: scenario.useMemory };
    const res = await fetch("/api/engine/run", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const queue: Ev[] = []; let runId: string | null = null;
    await readSse(res, (type, data) => {
      if (type === "engine") { const e = data as Ev; if (pace === "instant") { setEvents((l) => [...l, e]); setState(e.state); } else queue.push(e); }
      if (type === "done") runId = (data as { runId: string }).runId;
    });
    if (pace === "replay") for (const e of queue) { setEvents((l) => [...l, e]); setState(e.state); await new Promise((r) => setTimeout(r, 350)); }
    if (runId) await loadRun(runId);
    await refreshRuns(); setRunning(false);
  }, [run, scenario, pace, loadRun, refreshRuns]);

  const reset = async () => { await fetch("/api/engine/reset", { method: "POST" }); setRun(null); setEvents([]); setState("IDLE"); setRuns([]); setMemory([]); setCompareWith(""); };

  const r = run?.result ?? null; const d = r?.diagnosis ?? null;
  const num = (id: string, text: string, cls = "") => <button onClick={() => setInspect(id)} className={`underline decoration-gold/50 decoration-dotted underline-offset-[5px] transition-colors hover:text-gold-deep hover:decoration-gold ${cls}`} data-evidence={id}>{text}</button>;
  const Section = ({ n, title, note, id, children }: { n: string; title: string; note?: string; id: string; children: React.ReactNode }) => (
    <section className="border-t border-forest-900/10 py-12" data-testid={id}>
      <div className="grid gap-8 md:grid-cols-[180px_1fr]">
        <div><p className="eyebrow">{n}</p><h2 className="mt-2 font-serif text-3xl font-light leading-tight text-forest-900">{title}</h2>{note && <p className="mt-3 text-xs leading-relaxed text-forest-800/55">{note}</p>}</div>
        <div className="min-w-0">{children}</div>
      </div>
    </section>);
  const Figure = ({ label, value, note }: { label: string; value: React.ReactNode; note?: string }) => (
    <div><p className="eyebrow">{label}</p><p className="mt-2 font-serif text-4xl font-light tracking-tight text-forest-900">{value}</p>{note && <p className="mt-1 text-xs text-forest-800/55">{note}</p>}</div>);
  const shownEvents = showAllEvents ? [...events].reverse() : [...events].reverse().slice(0, 6);


  return (
    <div className="min-h-screen bg-cream-50 text-forest-900">
      <div className="mx-auto max-w-6xl px-6 md:px-10">
        {/* Masthead */}
        <header className="flex flex-wrap items-center justify-between gap-6 py-8">
          <div className="flex items-center gap-4">
            <Image src="/logo.png" alt="Anesis" width={500} height={500} className="h-16 w-16 object-contain" priority />
            <div className="leading-none">
              <p className="font-script text-3xl text-forest-900">Anesis</p>
              <p className="eyebrow mt-1.5">Commercial Intelligence System</p>
            </div>
          </div>
          <div className="text-right text-xs text-forest-800/55">
            <span className="rounded-full border border-gold/60 px-3 py-1 text-[0.65rem] uppercase tracking-[0.25em] text-gold-deep" data-testid="simulated-label">Simulated property data</span>
            {run && <p className="mt-2">{run.id} · {run.createdAt.replace("T", " ").slice(0, 19)} UTC · engine {run.durationMs} ms · memory used {run.input.memoryUsed}</p>}
          </div>
        </header>

        {/* The Core */}
        <section className="overflow-hidden rounded-[28px] bg-forest-950 text-cream-100 shadow-[0_40px_80px_-40px_rgba(14,31,22,0.6)]">
          <div className="grid gap-10 px-8 py-12 md:grid-cols-[1fr_360px] md:px-14 md:py-16">
            <div className="flex flex-col justify-between">
              <div>
                <p className="eyebrow !text-gold-light">The Core</p>
                <h1 className="mt-3 max-w-md font-serif text-4xl font-light leading-tight md:text-5xl">What should be done with the next {run ? gbp(run.input.budgetGbp) : "£16,000"}?</h1>
                <p className="mt-5 max-w-md text-sm leading-relaxed text-cream-100/60">The engine first establishes what it knows, what it does not, what limits the property, what information is worth buying, what to fund and what to block, and how it will be measured. Only then does it answer. Every figure below opens its own evidence.</p>
              </div>
              <div className="mt-10 flex flex-wrap items-center gap-3">
                <button onClick={() => startRun()} disabled={running} className="rounded-full bg-gold px-7 py-3.5 text-sm font-medium tracking-wide text-forest-950 transition-colors hover:bg-gold-light disabled:opacity-50" data-testid="run-cycle">{running ? "Running…" : "Run full decision cycle"}</button>
                <button onClick={() => startRun({ sameInputs: true })} disabled={running || !run} className="rounded-full border border-cream-50/25 px-5 py-3 text-sm text-cream-100/80 transition-colors hover:border-gold-light disabled:opacity-30" data-testid="run-again">Run again</button>
                <button onClick={reset} disabled={running} className="px-3 py-3 text-sm text-cream-100/50 transition-colors hover:text-cream-100 disabled:opacity-30" data-testid="reset">Reset</button>
              </div>
            </div>
            <div className="flex flex-col items-center justify-center"><Core state={state} size={280} /></div>
          </div>
          <div className="flex flex-wrap items-center gap-x-8 gap-y-2 border-t border-cream-50/10 px-8 py-4 text-xs text-cream-100/50 md:px-14">
            <label className="flex items-center gap-2">Event display<select value={pace} onChange={(e) => setPace(e.target.value as "instant" | "replay")} className="rounded border border-cream-50/20 bg-forest-950 px-2 py-1 text-cream-100"><option value="instant">as emitted</option><option value="replay">replay at reading pace</option></select></label>
            {pace === "replay" && <span>Replay shows recorded events with their real timestamps; the engine is not slowed.</span>}
            <span className="ml-auto">{events.length} events · real timestamps</span>
          </div>
        </section>

        {/* Toolbar: scenario, runs, comparison */}
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <details className="rounded-2xl border border-forest-900/10 bg-white/60 p-5" data-testid="scenario-lab">
            <summary className="cursor-pointer font-serif text-xl font-light">Scenario lab</summary>
            <p className="mt-1 text-xs text-forest-800/55">Change the property or an assumption, then run. Same inputs and memory always give the same decision.</p>
            <div className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
              {([["seed", "Seed", 1], ["budgetGbp", "Budget £", 1000], ["convMobile", "Mobile conversion", 0.0005], ["otaShare", "OTA share", 0.01], ["repeatRate", "Repeat rate", 0.01], ["benchConv", "Benchmark conv. p50", 0.0005]] as const).map(([k, label, step]) => (
                <label key={k} className="flex flex-col gap-1 text-forest-800/60">{label}<input type="number" step={step} value={scenario[k]} onChange={(e) => setScenario((s) => ({ ...s, [k]: Number(e.target.value) }))} className="rounded-md border border-forest-900/15 bg-cream-50 px-2 py-1.5 text-forest-900 focus:border-gold focus:outline-none" data-testid={`scenario-${k}`} /></label>))}
              <label className="flex flex-col gap-1 text-forest-800/60">Owner's plan<select value={scenario.ownerPlan} onChange={(e) => setScenario((s) => ({ ...s, ownerPlan: e.target.value }))} className="rounded-md border border-forest-900/15 bg-cream-50 px-2 py-1.5 text-forest-900"><option value="">none</option><option>I-001</option><option>I-002</option><option>I-003</option><option>I-004</option></select></label>
              <label className="flex items-center gap-2 self-end text-forest-800/60"><input type="checkbox" checked={scenario.useMemory} onChange={(e) => setScenario((s) => ({ ...s, useMemory: e.target.checked }))} /> use memory</label>
            </div>
          </details>
          <div className="rounded-2xl border border-forest-900/10 bg-white/60 p-5" data-testid="runs">
            <div className="flex items-center justify-between"><p className="font-serif text-xl font-light">Runs</p>
              {runs.length > 1 && <label className="flex items-center gap-2 text-xs text-forest-800/55">Compare with<select value={compareWith} onChange={(e) => { setCompareWith(e.target.value); if (run) void loadRun(run.id, e.target.value || undefined); }} className="rounded-md border border-forest-900/15 bg-cream-50 px-2 py-1 text-forest-900" data-testid="compare-select"><option value="">—</option>{runs.filter((x) => x.id !== run?.id).map((x) => <option key={x.id} value={x.id}>{x.id}</option>)}</select></label>}
            </div>
            {runs.length === 0 && <p className="mt-2 text-xs text-forest-800/45">No run yet.</p>}
            <ul className="mt-3 divide-y divide-forest-900/8 text-xs">
              {runs.map((x) => <li key={x.id} className="flex items-center justify-between gap-3 py-2"><button onClick={() => loadRun(x.id, compareWith || undefined)} className={`text-left hover:text-gold-deep ${run?.id === x.id ? "text-gold-deep" : "text-forest-800/80"}`}>{x.id} · {x.label}</button><span className="text-forest-800/45">{x.summary.selected.join(" + ") || "nothing funded"} · {x.summary.measurement ?? "not measured"}</span></li>)}
            </ul>
          </div>
        </div>

        {run?.diff && <section className="mt-6 rounded-2xl border border-gold/40 bg-white/60 p-6" data-testid="comparison"><p className="eyebrow">Comparison · {compareWith} → {run.id}</p>{run.diff.length === 0 ? <p className="mt-2 font-serif text-xl font-light">Identical outputs: same inputs, same memory, same decision.</p> : <table className="mt-3 w-full text-xs"><tbody>{run.diff.map((x) => <tr key={x.field} className="border-t border-forest-900/8 align-top"><th className="py-1.5 pr-4 text-left font-normal text-gold-deep">{x.field}</th><td className="py-1.5 pr-4 text-forest-800/55">{x.a}</td><td className="py-1.5 text-forest-900">{x.b}</td></tr>)}</tbody></table>}</section>}

        <div className="mt-6">
          {/* Event ledger */}
          <Section n="Ledger" title="Event stream" note="Each line is an engine event with the timestamp captured when it was emitted. Nothing is scripted." id="event-stream">
            {events.length === 0 && <p className="text-sm text-forest-800/50">No events. Run a decision cycle.</p>}
            <ol className="divide-y divide-forest-900/8 font-mono text-[0.72rem] leading-relaxed">
              {shownEvents.map((e) => <li key={`${e.runId}-${e.seq}`} className="flex gap-4 py-2"><span className="shrink-0 text-forest-800/40">{e.at.slice(11, 23)}</span><span className={`w-28 shrink-0 uppercase tracking-wider ${e.state === "BLOCKING" || e.state === "ALERT" ? "text-gold-deep" : "text-forest-800/45"}`}>{e.state}</span><span className="text-forest-800/85"><span className="text-forest-900">{e.type}</span> — {e.detail}{e.refs.length > 0 && <span className="ml-2">{e.refs.slice(0, 4).map((ref) => <button key={ref} onClick={() => setInspect(ref)} className="mr-1 text-gold-deep hover:underline">[{ref}]</button>)}</span>}</span></li>)}
            </ol>
            {events.length > 6 && <button onClick={() => setShowAllEvents((v) => !v)} className="link-underline mt-3 text-xs">{showAllEvents ? "Show latest six" : `Show all ${events.length} events`}</button>}
          </Section>

          {!r && <section className="border-t border-forest-900/10 py-16 text-center"><p className="font-serif text-2xl font-light">No decision cycle has been run.</p><p className="mt-2 text-sm text-forest-800/55">The core is idle. Nothing is displayed that has not been computed.</p></section>}

          {r && d && (<>
            <Section n="I · Diagnose" title={r.property.spec.name} note="Actual is what the simulated property earns. Attainable adds the deduplicated midpoint of the constraint gaps. Potential adds every gap at its upper benchmark, without deduplication." id="diagnosis">
              <div className="grid gap-8 sm:grid-cols-3">
                <Figure label="Actual" value={num("OBS-005", gbp(d.actualGbp))} note="room revenue, simulated PMS" />
                <Figure label="Attainable" value={num("OBS-005", gbp(d.attainableGbp))} note="actual + deduplicated midpoint" />
                <Figure label="Potential" value={num("OBS-005", gbp(d.potentialGbp))} note="benchmark assumptions, no dedup" />
              </div>
              <div className="mt-10 grid gap-8 sm:grid-cols-3">
                <Figure label="Total addressable · naive" value={gbp(d.totalAddressableGbp)} />
                <div className="sm:col-span-2"><p className="eyebrow">Deduplicated</p><p className="mt-2 font-serif text-4xl font-light tracking-tight text-forest-900" data-testid="dedup">{gbp(d.deduplicatedGbp.low)} <span className="text-forest-800/40">–</span> {gbp(d.deduplicatedGbp.high)}</p><p className="mt-2 text-xs leading-relaxed text-forest-800/55">Rule: {d.dedupMethod}. Constraint confidences {d.constraints.map((c) => c.confidence).join(" · ")} — declared, not measured.</p></div>
              </div>
              <table className="mt-10 w-full text-sm">
                <thead><tr className="text-left text-[0.62rem] uppercase tracking-[0.2em] text-gold-deep"><th className="pb-2 font-normal">Constraint</th><th className="pb-2 font-normal">Observed</th><th className="pb-2 font-normal">Benchmark</th><th className="pb-2 font-normal">Attainment</th><th className="pb-2 font-normal">Gap / year</th><th className="pb-2 font-normal">Status</th></tr></thead>
                <tbody>{d.constraints.map((c) => <tr key={c.id} className="border-t border-forest-900/8"><td className="py-3 pr-4">{num(c.id, `${c.id} ${c.name}`)}{c.id === d.binding && <span className="ml-2 rounded-full border border-gold px-2 py-0.5 text-[0.58rem] uppercase tracking-[0.18em] text-gold-deep">limiting</span>}</td><td className="py-3 pr-4">{num(c.evidence[0] ?? c.id, c.observed < 1 ? pct(c.observed, 2) : c.observed.toLocaleString("en-GB"))}</td><td className="py-3 pr-4">{num("SRC-BENCH", c.benchmark < 1 ? pct(c.benchmark, 1) : c.benchmark.toLocaleString("en-GB"))}</td><td className="py-3 pr-4">{pct(c.attainment)}</td><td className="py-3 pr-4">{num(c.id, `${gbp(c.gapGbp.low)} – ${gbp(c.gapGbp.high)}`)}</td><td className="py-3 text-[0.65rem] uppercase tracking-wider text-forest-800/55">{c.status}</td></tr>)}</tbody>
              </table>
              <blockquote className="mt-8 border-l-2 border-gold pl-5 font-serif text-lg font-light leading-relaxed text-forest-900" data-testid="binding-why">{d.bindingWhy}</blockquote>
            </Section>

            <Section n="II · Anticipate" title="Forward exposure" note="Probabilities are modelled assumptions, stated as such. Value at risk carries its formula." id="exposure">
              <ul className="divide-y divide-forest-900/8">{r.exposures.map((e) => <li key={e.id} className="py-4"><div className="flex flex-wrap items-baseline justify-between gap-2"><p className="font-serif text-xl font-light">{num(e.id, e.name)}</p><p className="font-serif text-xl font-light">{num(e.id, `${gbp(e.valueAtRiskGbp.low)} – ${gbp(e.valueAtRiskGbp.high)}`)}</p></div><p className="mt-1 text-xs text-forest-800/55">{e.horizonMonths} months · probability {e.probability} · <span className="uppercase tracking-wider text-gold-deep">modelled assumption</span> — {e.probabilityBasis}</p></li>)}</ul>
            </Section>

            <Section n="III · Decide" title={r.decision.question} note={r.allocation.formula} id="decision">
              <div className="divide-y divide-forest-900/8">
                {r.allocation.lines.map((l) => { const i = r.interventions.find((x) => x.id === l.interventionId)!; const v = r.voi.find((x) => x.interventionId === l.interventionId)!; return (
                  <div key={l.interventionId} className="py-6" data-testid={`line-${l.interventionId}`} data-funded={l.funded}>
                    <div className="flex flex-wrap items-baseline justify-between gap-3"><p className="font-serif text-2xl font-light">{num(i.id, `${i.id} ${i.name}`)}</p><p className={`text-[0.65rem] uppercase tracking-[0.22em] ${l.funded ? "text-gold-deep" : "text-forest-800/50"}`}>{l.funded ? `Funded · ${gbp(l.allocatedGbp)}` : "Action blocked"}</p></div>
                    <p className="mt-2 text-xs text-forest-800/60">Cost {gbp(i.costGbp)} · effect if it works {num(i.id, `${gbp(i.effectIfWorksGbp.low)} – ${gbp(i.effectIfWorksGbp.high)}`)} · confidence {num(i.id, pct(i.confidence))}{i.calibration ? ` (calibrated ×${i.calibration.factor})` : ""} · reversibility {i.reversibility} · risk-adjusted {gbp(l.riskAdjustedValueGbp)} · information: {v.decision.replace(/_/g, " ").toLowerCase()}</p>
                    {!l.funded && <div className="mt-4 rounded-xl bg-white/70 p-5"><p className="eyebrow">Why it is blocked</p><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-forest-800/85">{l.blockedBy.map((b, k) => <li key={k}>{b}</li>)}</ul><p className="mt-3 text-xs text-forest-800/70"><span className="font-medium text-forest-900">Required condition —</span> {l.requiredCondition}</p></div>}
                  </div>); })}
              </div>
              <div className="mt-8 grid gap-8 sm:grid-cols-2">
                <Figure label="Reserve" value={gbp(r.allocation.reserveGbp)} note={`never allocated · ${gbp(r.allocation.allocatedGbp)} of ${gbp(r.allocation.budgetGbp)} allocated`} />
                <div><p className="eyebrow">Governance</p><p className="mt-2 font-serif text-2xl font-light">Level {r.decision.governance.level}</p><p className="mt-1 text-xs text-forest-800/60">{r.decision.governance.reason}</p></div>
              </div>
              <div className="mt-8"><p className="eyebrow">Commercial Assay verdict</p><p className="mt-2 font-serif text-2xl font-light">{r.assay.verdict.replace(/_/g, " ")}</p><p className="mt-1 text-sm leading-relaxed text-forest-800/70">{r.assay.reason}</p></div>
              <div className="mt-8" data-testid="would-change"><p className="eyebrow">What would change this decision</p><ul className="mt-3 divide-y divide-forest-900/8 text-sm">{r.decision.wouldChangeIf.map((c, k) => <li key={k} className="py-2"><span className="font-mono text-xs text-gold-deep">{c.metric} {c.operator} {c.threshold}</span> <span className="text-forest-800/75">— {c.why}</span></li>)}</ul></div>
              <p className="mt-6 text-xs text-forest-800/50">{num(r.decision.id, `Decision record ${r.decision.id}`)} · alternatives {r.decision.alternatives.join(", ")} · rejected {r.decision.rejected.map((x) => x.id).join(", ") || "none"}</p>
            </Section>

            <Section n="IV · Measure" title="Pre-registration and measurement" note="The plan is hashed before any outcome exists. The estimator never sees the simulated truth." id="measurement">
              {!r.plan && <p className="text-sm text-forest-800/55">Nothing funded, so nothing was registered.</p>}
              {r.plan && <div className="text-sm"><p className="font-serif text-xl font-light">{num(r.plan.id, `${r.plan.id} · version ${r.plan.version}`)}</p><p className="mt-1 text-xs text-forest-800/55">registered {r.plan.registeredAt.replace("T", " ").slice(0, 19)} UTC · <span className="font-mono">sha256 {r.plan.sha256.slice(0, 16)}…</span></p><p className="mt-3 text-forest-800/80">Expected {gbp(r.plan.expectedGbp.low)} – {gbp(r.plan.expectedGbp.high)} (point {gbp(r.plan.expectedPointGbp)}) over {r.plan.windowWeeks} weeks · {r.plan.counterfactualMethod}.</p><p className="mt-1 text-xs text-forest-800/55">{r.plan.successRule}</p></div>}
              {r.measurement && (() => { const m = r.measurement; return (
                <div className="mt-8 grid gap-8 sm:grid-cols-2">
                  <div><p className="eyebrow">Result</p><p className="mt-2 font-serif text-4xl font-light tracking-tight" data-testid="measurement-status">{m.status}</p><p className="mt-1 text-xs text-forest-800/55">plan {m.planStatus.replace(/_/g, " ").toLowerCase()} · plan intact {String(m.planIntact)}</p><p className="mt-4 text-sm text-forest-800/85">Incremental {gbp(m.incrementalPointGbp)} · 90 % interval {gbp(m.incrementalGbp.low)} to {gbp(m.incrementalGbp.high)} · P(effect &gt; 0) {pct(m.pPositive)}</p><p className="mt-1 text-xs text-forest-800/55">observed {gbp(m.observedGbp)} vs counterfactual {gbp(m.counterfactualGbp)} · placebo rank {m.placebo.rank}/{m.placebo.of} · pre-fit RMSPE {pct(m.preFitRmspe, 1)}</p></div>
                  <div className="text-sm"><p className="eyebrow">Method, and why</p><p className="mt-2 text-forest-800/85">{m.method}</p><p className="mt-2 text-xs leading-relaxed text-forest-800/55">{m.methodWhy}</p><p className="mt-2 text-xs text-forest-800/55">Placebo: {m.placebo.note}.</p>{r.outcome && <p className="mt-3 text-xs text-gold-deep">Simulated truth {gbp(r.outcome.trueGainGbp)} — hidden from the estimator.</p>}</div>
                </div>); })()}
              {r.learning && <div className="mt-8" data-testid="learning"><p className="eyebrow">Learning</p><p className="mt-2 text-sm text-forest-800/85">{num(r.learning.id, r.learning.id)} · expected {gbp(r.learning.expectedGbp)} · observed {gbp(r.learning.observedGbp)} · forecast error {pct(r.learning.error)} · calibration applied: <span className="font-medium text-forest-900">{String(r.learning.calibrationApplied)}</span></p><p className="mt-1 text-xs text-forest-800/55">{r.learning.calibrationNote}</p></div>}
            </Section>
          </>)}

          <Section n="V · Learn" title="Anesis Memory" note="Property level: learning records from measured cycles. Methodology level: calibration derived from them. Portfolio level: planned." id="memory">
            {memory.length === 0 ? <p className="text-sm text-forest-800/50">Empty. Memory only holds what has been measured.</p> : <table className="w-full text-xs"><thead><tr className="text-left text-[0.62rem] uppercase tracking-[0.2em] text-gold-deep"><th className="pb-2 font-normal">Record</th><th className="pb-2 font-normal">Interventions</th><th className="pb-2 font-normal">Expected</th><th className="pb-2 font-normal">Observed</th><th className="pb-2 font-normal">Error</th><th className="pb-2 font-normal">Measurement</th><th className="pb-2 font-normal">Calibrated</th></tr></thead><tbody>{memory.map((l) => <tr key={l.id + l.timestamp} className="border-t border-forest-900/8"><td className="py-2">{l.id}</td><td>{l.interventionTypes.join(", ")}</td><td>{gbp(l.expectedGbp)}</td><td>{gbp(l.observedGbp)}</td><td>{pct(l.error)}</td><td>{l.measurementStatus}</td><td>{String(l.calibrationApplied)}</td></tr>)}</tbody></table>}
          </Section>

          <Section n="Ask" title="Ask Anesis" note="Typed or spoken. Answers are read from the records of the selected run; when the records do not contain an answer, Anesis says so." id="ask">
            <AskPanel runId={run?.id ?? null} onRunCreated={(id) => { void loadRun(id); void refreshRuns(); }} onOpenRef={setInspect} />
          </Section>

          <Section n="Environment" title="Capabilities" note="What is connected, what is not." id="capabilities">
            <div className="grid gap-8 sm:grid-cols-2 text-sm">
              <div><p className="eyebrow">Data connectors</p><ul className="mt-2 space-y-1 text-forest-800/75">{["SRC-SIM-PMS", "SRC-SIM-WEB", "SRC-SIM-CRM", "SRC-SIM-ADS", "SRC-SIM-COMPS"].map((s) => <li key={s}><button onClick={() => setInspect(s)} className="font-mono text-xs text-gold-deep hover:underline">{s}</button> <span className="text-[0.62rem] uppercase tracking-wider text-forest-800/45">simulated</span></li>)}</ul><p className="mt-2 text-xs text-forest-800/55">No property system is connected. Live adapters are planned and would authenticate through environment variables only.</p></div>
              <div><p className="eyebrow">Video analysis</p><p className="mt-2 text-forest-800/75">Video analysis is not enabled in this environment.</p><p className="mt-1 text-xs text-forest-800/55">Contract: a clip would yield observations confirmed by a human before use. No model runs here; nothing is inferred.</p></div>
              {run && <a href={`/api/engine/report/${run.id}`} target="_blank" className="link-underline sm:col-span-2 text-sm" data-testid="report-link">Open the printable decision report for {run.id} →</a>}
            </div>
          </Section>
        </div>
        <footer className="border-t border-forest-900/10 py-8 text-center text-[0.65rem] uppercase tracking-[0.25em] text-forest-800/40">Commercial Assay by Anesis · simulated environment</footer>
      </div>
      {inspect && r && <EvidenceInspector id={inspect} run={r} onOpen={setInspect} onClose={() => setInspect(null)} />}
    </div>
  );
}
