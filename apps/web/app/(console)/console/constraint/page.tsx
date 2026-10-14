import Link from "next/link";
import { consoleContext, run } from "@/lib/console/data";
import { Card, Stat, Pill, Bar, Empty, DemoBanner, gbp, pct, when } from "@/components/console/ui";
export const dynamic = "force-dynamic";
export const metadata = { title: "Commercial Constraint — Anesis" };

/** B. The Anesis Commercial Constraint: profile, real data and sources, constraints, missing data, hypotheses, evidence, confidence and limits. */
export default async function ConstraintPage({ searchParams }: { searchParams: Promise<{ run?: string }> }) {
  const { run: rid } = await searchParams; const ctx = await consoleContext(); const r = await run(rid ?? "latest");
  if (!r) return <main><DemoBanner demo={ctx.demo} simulated={ctx.simulatedProperty} /><Empty>No cycle yet. <Link className="link-underline" href="/console/assay">Run an assay</Link>.</Empty></main>;
  const res = r.result; const d = res.diagnosis; const spec = res.property.spec; const obs = res.property.observations;
  const byId = (id: string) => obs.find((o) => o.id === id);
  const real = obs.filter((o) => o.status === "VERIFIED" || (o.status === "MODELLED" && o.source.startsWith("CONN-")));
  const profile: [string, string, string][] = [["Rooms", String(spec.rooms), "rooms"], ["Occupancy", pct(spec.occupancy, 1), "occupancy"], ["ADR", gbp(spec.adrGbp), "adr"], ["OTA share", pct(spec.otaShare, 1), "ota_share"], ["OTA commission", pct(spec.otaCommission, 1), "ota_commission_rate"], ["Peak occupancy", pct(spec.peakOccupancy), "ops.peak_occupancy"], ["Sessions / year", spec.sessionsPerYear.toLocaleString("en-GB"), "sessions.total"], ["Mobile conversion", pct(spec.convMobile, 2), "conv.mobile"], ["Past guests", spec.pastGuests.toLocaleString("en-GB"), "crm.past_guests"]];
  const fromData = (metric: string) => { const o = obs.find((x) => x.metric === metric); return o ? (o.status === "VERIFIED" || (o.status === "MODELLED" && o.source.startsWith("CONN-")) ? "data" : "declared") : "declared"; };
  return (
    <main>
      <DemoBanner demo={ctx.demo} simulated={ctx.simulatedProperty} />
      <p className="eyebrow">The Anesis Commercial Constraint</p>
      <h1 className="font-serif text-4xl">{spec.name}</h1>
      <p className="mt-1 text-sm text-forest-800/70">Cycle {r.id} · {when(r.createdAt)} · evidence policy <strong>{d.evidencePolicy.replace("_", " ")}</strong> · {real.length} real-backed observations of {obs.length} · weekly history: {res.seriesSource === "pms_weekly" ? `${res.property.series.property.length} weeks from the PMS` : "simulated"}</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_2fr]">
        <Card eyebrow="Profile" title="As the data describe it">
          <ul className="divide-y divide-forest-900/10 text-sm">{profile.map(([k, v, m]) => <li key={k} className="flex items-center justify-between py-1.5"><span>{k}</span><span className="flex items-center gap-2 font-medium">{v} <Pill v={fromData(m) === "data" ? "VERIFIED" : "SIMULATED"} title={fromData(m) === "data" ? "from a connected system" : "declared or simulated: not used in any assessable conclusion under verified_only"} /></span></li>)}</ul>
          <p className="mt-2 text-xs text-forest-800/60">Green: from a connected system. Grey: declared or simulated; under verified_only it never enters a conclusion.</p>
        </Card>
        <Card eyebrow="Constraints" title={d.binding ? `Binding: ${d.binding}` : "No binding constraint assessable"}>
          <p className="mb-3 text-sm text-forest-800/80">{d.bindingWhy}</p>
          <ul className="space-y-2">{d.constraints.map((c) => <li key={c.id} className={`rounded-xl border px-4 py-3 ${c.id === d.binding ? "border-gold bg-gold/10" : "border-forest-900/10"}`}>
            <div className="flex flex-wrap items-center justify-between gap-2"><div><span className="font-mono text-xs text-gold-deep">{c.id}</span> <span className="font-medium">{c.name}</span></div><div className="flex items-center gap-2">{c.assessable ? <Pill v="VERIFIED" title="assessable on verified data" /> : <Pill v="SIMULATED" title="withheld" />}<span className="text-xs">{c.kind}</span></div></div>
            {c.assessable ? <><div className="mt-2 grid grid-cols-3 gap-3 text-xs"><div>observed <strong>{c.metric.includes("occupancy") || c.metric.includes("share") || c.metric.includes("conv") || c.metric.includes("rate") ? pct(c.observed, 1) : c.observed.toLocaleString("en-GB")}</strong> vs benchmark <strong>{c.metric.includes("occupancy") || c.metric.includes("share") || c.metric.includes("conv") || c.metric.includes("rate") ? pct(c.benchmark, 1) : c.benchmark.toLocaleString("en-GB")}</strong></div><div>attainment {pct(c.attainment)}<Bar value={c.attainment} /></div><div>gap {gbp(c.gapGbp.low)} – {gbp(c.gapGbp.high)} / year</div></div><p className="mt-1 text-xs text-forest-800/70">{c.formula}</p><p className="text-[11px] text-forest-800/60">evidence: {c.evidence.map((e) => `${e} ${byId(e)?.metric ?? ""}`).join(" · ")} · confidence {c.confidence}</p></>
            : <p className="mt-2 text-xs text-amber-900">Withheld — needs: {c.missing.join("; ")}</p>}
          </li>)}</ul>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <Stat label="Actual (verified revenue)" value={gbp(d.actualGbp)} note={d.actualGbp === 0 ? "withheld" : "annual"} />
        <Stat label="Attainable" value={gbp(d.attainableGbp)} note="actual + deduplicated gaps" tone="gold" />
        <Stat label="Potential" value={gbp(d.potentialGbp)} note="under benchmark assumptions" />
        <Stat label="Withheld" value={d.notAssessable.length} note={d.notAssessable.join(", ") || "none"} tone={d.notAssessable.length ? "warn" : "default"} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card eyebrow="Hypotheses" title="Interventions the diagnosis produces">
          <ul className="space-y-2 text-sm">{res.records.map((rec) => <li key={rec.id} className="rounded-xl border border-forest-900/10 px-4 py-3"><div className="flex items-center justify-between gap-2"><span><span className="font-mono text-xs text-gold-deep">{rec.id}</span> {rec.name}</span><Pill v={rec.decisionStatus} /></div><p className="mt-1 text-xs text-forest-800/70">acts on {rec.constraint.join(", ")} · estimate {gbp(rec.capitalGbp)} · effect if it works {gbp(rec.expectedImpactGbp.low)} – {gbp(rec.expectedImpactGbp.high)} · confidence {pct(rec.confidence)}</p><p className="text-[11px] text-forest-800/60">{rec.confidenceBasis}</p></li>)}</ul>
        </Card>
        <Card eyebrow="Confidence and limits" title="What bounds this analysis">
          <ul className="space-y-1 text-sm">{res.dataQualityNotes.length ? res.dataQualityNotes.map((n) => <li key={n} className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">{n}</li>) : <li className="text-xs text-forest-800/60">No data-quality reduction recorded.</li>}</ul>
          <p className="mt-3 text-sm"><strong>Seasonality:</strong> {res.seasonality.statement}</p>
          <p className="mt-1 text-sm"><strong>Attribution:</strong> {res.attribution.verdict.replace("_", " ")} — {res.attribution.note}</p>
          <p className="mt-1 text-sm"><strong>Most sensitive unknown:</strong> {res.mostSensitiveUnknown.unknown} ({res.mostSensitiveUnknown.valueOfInformation}) — {res.mostSensitiveUnknown.reason}</p>
          <p className="mt-1 text-sm"><strong>Benchmarks:</strong> {Object.keys(r.input.benchmarks ?? {}).length ? `${Object.keys(r.input.benchmarks ?? {}).length} declared with a source` : "placeholders only (SRC-BENCH) — no constraint can be assessed against them under verified_only"}</p>
        </Card>
      </div>

      <Card className="mt-6" eyebrow="Evidence" title={`Observations (${obs.length})`}>
        <div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="text-left text-forest-800/60"><th className="py-1 pr-3">id</th><th className="pr-3">metric</th><th className="pr-3">value</th><th className="pr-3">source</th><th className="pr-3">status</th><th className="pr-3">as of</th><th>transformation</th></tr></thead>
          <tbody>{[...obs].sort((a, b) => (a.status === "VERIFIED" ? 0 : 1) - (b.status === "VERIFIED" ? 0 : 1)).map((o) => <tr key={o.id} className="border-t border-forest-900/5"><td className="py-1 pr-3 font-mono">{o.id}</td><td className="pr-3">{o.metric}</td><td className="pr-3">{o.value.toLocaleString("en-GB", { maximumFractionDigits: 4 })} {o.unit}</td><td className="pr-3 font-mono">{o.source}</td><td className="pr-3"><Pill v={o.status} /></td><td className="pr-3">{o.timestamp.slice(0, 10)}</td><td className="text-forest-800/70">{o.transformation}{o.assumptions.length ? ` · ${o.assumptions.join("; ")}` : ""}</td></tr>)}</tbody></table></div>
      </Card>
    </main>
  );
}
