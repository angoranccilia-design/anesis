"use client";
import type { CycleResult } from "@anesis/engine";

const gbp = (x: number) => `£${Math.round(x).toLocaleString("en-GB")}`;

/** Resolves any record id in a run to its provenance. Nothing is shown that is not in the run. */
export function EvidenceInspector({ id, run, onOpen, onClose }: { id: string; run: CycleResult; onOpen: (id: string) => void; onClose: () => void }) {
  const rows: [string, React.ReactNode][] = [];
  const refs = (ids: readonly string[]) => <span className="flex flex-wrap gap-1">{ids.map((e) => <button key={e} onClick={() => onOpen(e)} className="rounded border border-gold/50 px-1.5 py-0.5 font-mono text-[0.7rem] text-gold-deep hover:border-gold">{e}</button>)}</span>;
  let title = id, kind = "record";
  const obs = run.property.observations.find((o) => o.id === id);
  const c = run.diagnosis.constraints.find((x) => x.id === id);
  const e = run.exposures.find((x) => x.id === id);
  const i = run.interventions.find((x) => x.id === id);
  const src = run.property.spec && ["SRC-SIM-PMS", "SRC-SIM-WEB", "SRC-SIM-CRM", "SRC-SIM-ADS", "SRC-SIM-COMPS", "SRC-BENCH", "SRC-DERIVED"].includes(id) ? id : null;
  if (obs) {
    kind = "observation"; title = `${obs.id} · ${obs.metric}`;
    rows.push(["Value", `${obs.unit === "GBP" || obs.unit.startsWith("GBP") ? gbp(obs.value) : Number(obs.value.toFixed(4)).toLocaleString("en-GB")} ${obs.unit}`], ["Period", obs.period], ["Source", <button onClick={() => onOpen(obs.source)} className="underline decoration-gold/60 text-gold-deep">{obs.source}</button>], ["Timestamp", obs.timestamp], ["Transformation", obs.transformation], ["Assumptions", obs.assumptions.join("; ") || "none"], ["Confidence", String(obs.confidence)], ["Status", <b className="tracking-wider">{obs.status}</b>], ["Evidence", obs.evidence.length ? refs(obs.evidence) : "raw"]);
  } else if (c) {
    kind = "constraint"; title = `${c.id} · ${c.name}`;
    rows.push(["Factor", c.factor], ["Metric", c.metric], ["Observed", String(c.observed)], ["Benchmark", `${c.benchmark} (placeholder, status BENCHMARK)`], ["Attainment", `${(c.attainment * 100).toFixed(0)} %`], ["Gap (before dedup)", `${gbp(c.gapGbp.low)} – ${gbp(c.gapGbp.high)} / year`], ["Formula", c.formula], ["Assumptions", c.assumptions.join("; ")], ["Confidence", String(c.confidence)], ["Status", <b className="tracking-wider">{c.status}</b>], ["Depends on", c.dependsOn.length ? refs(c.dependsOn) : "—"], ["Evidence", refs(c.evidence)], ["Computed at", run.diagnosis.computedAt]);
  } else if (e) {
    kind = "exposure"; title = `${e.id} · ${e.name}`;
    rows.push(["Horizon", `${e.horizonMonths} months`], ["Probability", `${e.probability} — ${e.probabilityBasis}`], ["Value at risk", `${gbp(e.valueAtRiskGbp.low)} – ${gbp(e.valueAtRiskGbp.high)}`], ["Formula", e.formula], ["Drivers", e.drivers.join("; ")], ["Mitigation", e.mitigation.join("; ")], ["Uncertainty", e.uncertainty], ["Status", <b className="tracking-wider">{e.status}</b>], ["Evidence", refs(e.evidence)]);
  } else if (i) {
    kind = "intervention"; title = `${i.id} · ${i.name}`;
    const v = run.voi.find((x) => x.interventionId === i.id), l = run.allocation.lines.find((x) => x.interventionId === i.id);
    rows.push(["Acts on", i.actsOn], ["Addresses", refs(i.addresses)], ["Cost", gbp(i.costGbp)], ["Effect if it works", `${gbp(i.effectIfWorksGbp.low)} – ${gbp(i.effectIfWorksGbp.high)} / year`], ["Confidence", `${i.confidence} — ${i.confidenceBasis}`], ["Calibration", i.calibration ? `× ${i.calibration.factor} from ${i.calibration.cycles} measured cycle(s)` : "none applied (no measured history for this type)"], ["Risk / reversibility", `${i.risk} / ${i.reversibility}`], ["Time to impact", `${i.timeToImpactWeeks} weeks`], ["Must follow", i.mustFollow.length ? refs(i.mustFollow) : "—"], ["Information option", i.informationOption ? `${i.informationOption.name} — ${gbp(i.informationOption.costGbp)}, quality ${i.informationOption.quality}` : "none"]);
    if (v) rows.push(["Value of information", `${v.decision.replace(/_/g, " ")} — EV ${gbp(v.expectedValueGbp)}, EVPI ${gbp(v.evpiGbp)}, EVSI ${gbp(v.evsiGbp)} vs cost ${gbp(v.informationCostGbp)}`]);
    if (l) rows.push(["Allocation", l.funded ? `FUNDED ${gbp(l.allocatedGbp)} · risk-adjusted ${gbp(l.riskAdjustedValueGbp)}` : `BLOCKED — ${l.blockedBy.join(" | ")}`], ["Required condition", l.requiredCondition ?? "—"]);
    rows.push(["Evidence", refs(i.evidence)]);
  } else if (src) {
    kind = "source"; title = src;
    const notes: Record<string, string> = { "SRC-SIM-PMS": "Simulated property-management export (rooms, occupancy, ADR, distribution, seasonality). SIMULATED — no PMS is connected.", "SRC-SIM-WEB": "Simulated web analytics (sessions, device mix, conversion, funnel, speed). SIMULATED — no analytics property is connected.", "SRC-SIM-CRM": "Simulated guest database (past guests, repeat rate, email engagement). SIMULATED.", "SRC-SIM-ADS": "Simulated advertising accounts (spend, clicks, conversions). SIMULATED.", "SRC-SIM-COMPS": "Simulated comparable properties' weekly room revenue (10 units). SIMULATED.", "SRC-BENCH": "Benchmark placeholders — status BENCHMARK until a documented source replaces each value.", "SRC-DERIVED": "Values computed by the engine from other observations by a declared formula (status MODELLED)." };
    rows.push(["Kind", src.startsWith("SRC-SIM") ? "simulation adapter" : src === "SRC-BENCH" ? "benchmark" : "derived"], ["Note", notes[src] ?? ""], ["Real connector", "PLANNED — a live adapter would read the same metrics under status VERIFIED with credentials supplied through environment variables"]);
  } else if (id.startsWith("D-")) {
    kind = "decision"; const d = run.decision; title = `${d.id} · ${d.question}`;
    rows.push(["Selected", refs(d.selected)], ["Rejected", d.rejected.map((r) => `${r.id}: ${r.reasons.join(" | ")}`).join("\n")], ["Expected value", gbp(d.expectedValueGbp)], ["Confidence", `${(d.confidence * 100).toFixed(0)} % — ${d.confidenceBasis}`], ["Assumptions", d.assumptions.join("\n")], ["Governance", `level ${d.governance.level} — ${d.governance.reason}`], ["Evidence", refs(d.evidence)], ["Timestamp", d.timestamp]);
  } else if (id.startsWith("MP-") && run.plan) {
    kind = "measurement plan"; const p = run.plan; title = `${p.id} v${p.version}`;
    rows.push(["SHA-256", <code className="break-all text-[0.7rem]">{p.sha256}</code>], ["Supersedes", p.supersedes ?? "—"], ["Registered", p.registeredAt], ["Hypotheses", p.hypotheses.join("\n")], ["Primary metric", p.primaryMetric], ["Baseline", p.baseline], ["Expected", `${gbp(p.expectedGbp.low)} – ${gbp(p.expectedGbp.high)}, point ${gbp(p.expectedPointGbp)}`], ["Window", `${p.windowWeeks} weeks`], ["Counterfactual", p.counterfactualMethod], ["Success rule", p.successRule], ["Stopping rule", p.stoppingRule]);
  } else if (id.startsWith("LR-") && run.learning) {
    kind = "learning record"; const l = run.learning; title = l.id;
    rows.push(["Interventions", refs(l.interventionTypes)], ["Expected / observed", `${gbp(l.expectedGbp)} / ${gbp(l.observedGbp)}`], ["Forecast error", `${(l.error * 100).toFixed(0)} %`], ["Measurement", l.measurementStatus], ["Calibration applied", String(l.calibrationApplied)], ["Note", l.calibrationNote], ["Context", JSON.stringify(l.context)]);
  } else {
    rows.push(["Not found", "This id is not a record of the current run."]);
  }
  return (
    <aside className="fixed inset-y-0 right-0 z-40 w-full max-w-md overflow-y-auto border-l border-gold/40 bg-cream-50 p-7 text-forest-900 shadow-[-30px_0_60px_-30px_rgba(14,31,22,0.35)]" data-testid="evidence-inspector">
      <div className="flex items-start justify-between gap-4">
        <div><p className="eyebrow">Evidence · {kind}</p><h3 className="mt-2 font-serif text-2xl font-light leading-tight">{title}</h3></div>
        <button onClick={onClose} className="rounded-full border border-forest-900/20 px-3 py-1 text-xs text-forest-800 hover:border-gold" aria-label="Close">Close</button>
      </div>
      <table className="mt-5 w-full text-sm"><tbody>
        {rows.map(([k, v], n) => <tr key={n} className="border-t border-forest-900/8 align-top"><th className="w-32 py-2.5 pr-3 text-left font-normal text-gold-deep">{k}</th><td className="whitespace-pre-wrap py-2.5 text-forest-800/90">{v}</td></tr>)}
      </tbody></table>
    </aside>
  );
}
