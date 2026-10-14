import { consoleContext, run } from "@/lib/console/data";
import { Card, Stat, Pill, Empty, DemoBanner, gbp, pct, when } from "@/components/console/ui";
export const dynamic = "force-dynamic";
export const metadata = { title: "Decision Engine — Anesis" };

/** D. From signal to hypothesis to recommendation: value of information, allocation with reasons, the decision, what would change it, what remains to verify. */
export default async function DecisionPage({ searchParams }: { searchParams: Promise<{ run?: string }> }) {
  const { run: rid } = await searchParams; const ctx = await consoleContext(); const r = await run(rid ?? "latest");
  if (!r) return <main><DemoBanner demo={ctx.demo} simulated={ctx.simulatedProperty} /><Empty>No cycle yet.</Empty></main>;
  const res = r.result; const dec = res.decision; const rec = (id: string) => res.records.find((x) => x.id === id)!;
  const steps = [
    { k: "1 · Observe", v: `${res.verifiedMetrics.length} verified metrics, ${res.context.connectors.filter((c) => c.status === "CONNECTED").length} live sources` },
    { k: "2 · Diagnose", v: res.diagnosis.binding ? `binding ${res.diagnosis.binding}; ${res.diagnosis.notAssessable.length} withheld` : "nothing assessable" },
    { k: "3 · Anticipate", v: `${res.exposures.length} exposures, ${res.fused.length} external verdicts` },
    { k: "4 · Value information", v: res.voi.filter((v) => v.decision === "COLLECT_MORE_INFORMATION").map((v) => v.interventionId).join(", ") || "no study worth more than acting" },
    { k: "5 · Prioritise", v: `${res.allocation.lines.filter((l) => l.funded).length} funded, ${res.allocation.lines.filter((l) => l.status === "BLOCKED").length} blocked` },
    { k: "6 · Decide", v: `${dec.id}: ${dec.selected.join(", ") || "nothing"} · L${dec.governance.level}` },
    { k: "7 · Pre-register", v: res.plan ? `${res.plan.id} v${res.plan.version} · sha256 ${res.plan.sha256.slice(0, 10)}…` : "no plan (nothing funded)" },
  ];
  return (
    <main>
      <DemoBanner demo={ctx.demo} simulated={ctx.simulatedProperty} />
      <p className="eyebrow">Commercial Decision Engine</p><h1 className="font-serif text-4xl">{dec.question}</h1>
      <p className="mt-1 text-sm text-forest-800/70">Cycle {r.id} · {when(r.createdAt)} · {dec.id} · confidence {pct(dec.confidence)} — {dec.confidenceBasis}</p>
      <ol className="mt-6 grid gap-2 md:grid-cols-7">{steps.map((s, i) => <li key={s.k} className={`rounded-xl border px-3 py-2 text-xs ${i === 5 ? "border-gold bg-gold/10" : "border-forest-900/10 bg-white/60"}`}><p className="eyebrow">{s.k}</p><p className="mt-1">{s.v}</p></li>)}</ol>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card eyebrow="Allocation" title={`${gbp(res.allocation.allocatedGbp)} of ${gbp(res.allocation.budgetGbp)} (reserve ${gbp(res.allocation.reserveGbp)})`}>
          <ul className="space-y-2 text-sm">{res.allocation.lines.map((l) => { const x = rec(l.interventionId); return <li key={l.interventionId} className={`rounded-xl border px-4 py-3 ${l.funded ? "border-gold bg-gold/10" : "border-forest-900/10"}`}><div className="flex items-center justify-between gap-2"><span><span className="font-mono text-xs text-gold-deep">{l.interventionId}</span> {x.name}</span><Pill v={l.status} /></div><div className="mt-1 grid grid-cols-3 gap-2 text-xs"><span>estimate {gbp(x.capitalGbp)}</span><span>expected value {gbp(l.expectedValueGbp)}</span><span>risk-adjusted {gbp(l.riskAdjustedValueGbp)}</span></div>{l.blockedBy.length > 0 && <ul className="mt-1 text-xs text-forest-800/80">{l.blockedBy.map((b) => <li key={b}>• {b}</li>)}</ul>}{l.requiredCondition && <p className="mt-1 text-xs text-gold-deep">Required: {l.requiredCondition}</p>}<p className="mt-1 text-[11px] text-forest-800/60">risk {x.risk} · reversibility {x.reversibility} · owner {x.owner} · approval {x.approvalTier}</p></li>; })}</ul>
          <p className="mt-2 text-[11px] text-forest-800/60">{res.allocation.formula}</p>
        </Card>
        <div className="space-y-6">
          <Card eyebrow="Value of information" title="Act or learn first?">
            <ul className="space-y-1 text-xs">{res.voi.map((v) => <li key={v.interventionId} className="rounded-lg bg-cream-100 px-3 py-2"><span className="font-mono">{v.interventionId}</span> <strong>{v.decision.replace(/_/g, " ")}</strong> · EV {gbp(v.expectedValueGbp)} · EVPI {gbp(v.evpiGbp)} · EVSI {gbp(v.evsiGbp)} vs cost {gbp(v.informationCostGbp)}<p className="text-forest-800/70">{v.reason}</p></li>)}</ul>
          </Card>
          <Card eyebrow="What would change this decision" title={`${dec.wouldChangeIf.length} conditions`}>
            {dec.wouldChangeIf.length ? <ul className="space-y-1 text-xs">{dec.wouldChangeIf.map((w, i) => <li key={i} className="border-b border-forest-900/5 py-1"><strong>{w.metric} {w.operator} {w.threshold}</strong> — {w.why}</li>)}</ul> : <Empty>No threshold inside the plausible ranges flips an intervention.</Empty>}
            <p className="mt-2 text-sm"><strong>Most sensitive variable:</strong> {res.decisionSensitivity.mostSensitiveVariable ?? "none"} · {res.decisionSensitivity.whatWouldChangeMyMind}</p>
          </Card>
          <Card eyebrow="Pre-registration" title={res.plan ? `${res.plan.id} v${res.plan.version}` : "No plan"}>
            {res.plan ? <><p className="text-xs">sha256 <span className="font-mono">{res.plan.sha256}</span></p><p className="mt-1 text-sm">{res.plan.hypotheses.join(" ")}</p><div className="mt-2 grid grid-cols-3 gap-2"><Stat label="Expected" value={`${gbp(res.plan.expectedGbp.low)} – ${gbp(res.plan.expectedGbp.high)}`} /><Stat label="Window" value={`${res.plan.windowWeeks} weeks`} /><Stat label="Primary metric" value={res.plan.primaryMetric} /></div><p className="mt-2 text-xs text-forest-800/70">Success: {res.plan.successRule} · Stop: {res.plan.stoppingRule} · Method: {res.plan.counterfactualMethod}</p></> : <Empty>Nothing funded in this cycle, so nothing is pre-registered.</Empty>}
          </Card>
        </div>
      </div>

      <Card className="mt-6" eyebrow="Still to verify" title="Data requirements per intervention">
        <div className="grid gap-2 md:grid-cols-2">{res.requirements.map((q) => <div key={q.interventionId} className="rounded-lg border border-forest-900/10 px-3 py-2 text-xs"><div className="flex items-center justify-between"><span className="font-mono">{q.interventionId}</span><Pill v={q.verdict === "SUFFICIENT" ? "VERIFIED" : q.verdict === "INVESTIGATE" ? "INVESTIGATE" : "BLOCKED"} /></div><ul className="mt-1">{q.checks.map((c) => <li key={c.item} className={c.satisfied ? "text-forest-800/70" : "text-amber-900"}>{c.satisfied ? "✓" : "✗"} {c.item}{c.critical ? " (critical)" : ""} — {c.how}</li>)}</ul></div>)}</div>
      </Card>
    </main>
  );
}
