import Link from "next/link";
import { consoleContext, latest, properties, imports, contracts, health, alertsOf } from "@/lib/console/data";
import { Card, Stat, Pill, Empty, DemoBanner, gbp, pct, when } from "@/components/console/ui";
export const dynamic = "force-dynamic";
export const metadata = { title: "Command Center — Anesis" };

/** A. Command Center: establishments, current commercial situation, alerts and signals, priorities, data and connection state. Every figure is read from the latest real cycle. */
export default async function CommandCenter() {
  const ctx = await consoleContext(); const [r, props, imps, cs, h] = await Promise.all([latest(), properties(), imports(), contracts(), health()]);
  const d = r?.result.diagnosis; const binding = d?.constraints.find((c) => c.id === d.binding);
  const connected = r?.context.connectors.filter((c) => c.status === "CONNECTED") ?? []; const operator = r?.context.connectors.filter((c) => c.status === "OPERATOR_ENTERED") ?? [];
  const alerts = r ? alertsOf(r.result) : []; const fused = r?.result.fused.filter((f) => f.verdict === "FORWARD_EXPOSURE" || f.verdict === "COMMERCIAL_OPPORTUNITY") ?? [];
  const priorities = r?.result.allocation.lines.filter((l) => l.status === "FUNDED" || l.status === "INVESTIGATE" || l.status === "IN_PROGRESS") ?? [];
  const open = cs.filter((c) => !["CLOSED", "REJECTED", "WITHDRAWN"].includes(c.state));
  return (
    <main>
      <DemoBanner demo={ctx.demo} simulated={ctx.simulatedProperty} />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="eyebrow">Command Center</p><h1 className="font-serif text-4xl">{r?.result.property.spec.name ?? "No cycle yet"}</h1><p className="mt-1 text-sm text-forest-800/70">{r ? `Latest cycle ${r.id} · ${when(r.createdAt)} · evidence policy ${d!.evidencePolicy.replace("_", " ")} · ${r.result.seriesSource === "pms_weekly" ? "weekly history from the PMS" : "simulated weekly history"}` : "Run an assay to populate this view."}</p></div>
        <Link href="/console/assay" className="btn-primary">Run an assay</Link>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <Stat label="Actual revenue (verified)" value={d ? gbp(d.actualGbp) : "—"} note={d && d.actualGbp === 0 ? "withheld: revenue not verified" : "annual room revenue from the data"} />
        <Stat label="Attainable" value={d ? gbp(d.attainableGbp) : "—"} note="actual + deduplicated assessable gaps" tone="gold" />
        <Stat label="Binding constraint" value={binding ? binding.id : d ? "none assessable" : "—"} note={binding ? `${binding.name} · attainment ${pct(binding.attainment)}` : d?.bindingWhy.slice(0, 90)} tone={binding ? "default" : "warn"} />
        <Stat label="Decision" value={r ? (r.result.decision.selected.join(", ") || "nothing funded") : "—"} note={r ? `governance L${r.result.decision.governance.level} · £${r.result.allocation.allocatedGbp.toLocaleString("en-GB")} allocated of £${r.result.allocation.budgetGbp.toLocaleString("en-GB")}` : undefined} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card eyebrow="Establishments" title="Followed">
          <ul className="divide-y divide-forest-900/10 text-sm">{props.map((p) => <li key={p.id} className="flex items-center justify-between py-2"><div><p className="font-medium">{p.name}</p><p className="text-xs text-forest-800/60">{p.id} · {p.cycles} cycle{p.cycles === 1 ? "" : "s"} · last {when(p.lastCycleAt)}</p></div>{p.simulated ? <Pill v="SIMULATED" /> : p.id === ctx.propertyId ? <Pill v="VERIFIED" title="served by this console" /> : null}</li>)}</ul>
          <p className="mt-3 text-xs text-forest-800/60">This console serves {ctx.propertyId}. Declare more with the runtime CLI.</p>
        </Card>
        <Card eyebrow="Alerts and signals" title={`${alerts.length + fused.length} to read`}>
          {alerts.length + fused.length === 0 ? <Empty>No alert in the latest cycle.</Empty> : <ul className="space-y-2 text-sm">
            {fused.map((f) => <li key={f.id} className="rounded-lg bg-amber-50 px-3 py-2"><Pill v="ALERT" /> <span className="ml-1 font-medium">{f.scope}</span> → {f.verdict.replace("_", " ")}<p className="mt-1 text-xs text-forest-800/80">{f.statement}</p></li>)}
            {alerts.map((e) => <li key={e.seq} className="rounded-lg bg-cream-100 px-3 py-2"><span className="font-mono text-[11px] text-gold-deep">{e.type}</span><p className="mt-1 text-xs text-forest-800/80">{e.detail.slice(0, 260)}{e.detail.length > 260 ? "…" : ""}</p></li>)}
          </ul>}
        </Card>
        <Card eyebrow="Priorities" title="Decisions on the table">
          {priorities.length === 0 ? <Empty>Nothing funded or under investigation.</Empty> : <ul className="space-y-2 text-sm">{priorities.map((l) => { const rec = r!.result.records.find((x) => x.id === l.interventionId)!; return <li key={l.interventionId} className="rounded-lg border border-forest-900/10 px-3 py-2"><div className="flex items-center justify-between"><span className="font-medium">{rec.name}</span><Pill v={l.status} /></div><p className="mt-1 text-xs text-forest-800/70">{l.status === "FUNDED" ? `estimate ${gbp(rec.capitalGbp)} · expected ${gbp(l.expectedValueGbp)} · approval L${rec.approvalLevel}` : l.blockedBy[0]}</p></li>; })}</ul>}
          <p className="mt-3 text-xs"><Link className="link-underline" href="/console/decision">Why → Decision Engine</Link></p>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card eyebrow="Data state" title="What the engine rests on">
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Verified metrics" value={r?.result.verifiedMetrics.length ?? 0} note={r?.result.verifiedMetrics.join(", ")} />
            <Stat label="Withheld constraints" value={d?.notAssessable.length ?? 0} note="not assessable on verified data" tone={d && d.notAssessable.length ? "warn" : "default"} />
          </div>
          <p className="mt-3 text-xs text-forest-800/70">Latest import: {imps[0] ? `${imps[0].filename} · ${imps[0].periodFrom} → ${imps[0].periodTo} · ${imps[0].verdict}` : "none"}</p>
          <p className="mt-1 text-xs"><Link className="link-underline" href="/console/data">Imports, registers and connectors →</Link></p>
        </Card>
        <Card eyebrow="Connections" title={`${connected.length} live · ${operator.length} declared`}>
          <ul className="flex flex-wrap gap-1.5">{r?.context.connectors.map((c) => <li key={c.id} className="flex items-center gap-1 rounded-full border border-forest-900/10 px-2 py-0.5 text-[11px]"><span className="font-mono">{c.id.replace("CONN-", "")}</span><Pill v={c.status} title={c.statusNote} /></li>)}</ul>
          <p className="mt-3 text-xs text-forest-800/60">Context fetched {when(r?.context.fetchedAt)}. A status is CONNECTED only after a successful call in that cycle.</p>
        </Card>
        <Card eyebrow="System" title={h ? (h.ok ? "Healthy" : "Attention") : "No runtime"}>
          {h ? <><p className="text-sm">Runtime database: {h.backend}{ctx.demo ? " (in-memory, resets on restart)" : ""}.</p><p className="mt-1 text-sm">{open.length} open contract{open.length === 1 ? "" : "s"}, {cs.length} in total.</p>{h.problems.length ? <ul className="mt-2 text-xs text-amber-900">{h.problems.map((p) => <li key={p}>• {p}</li>)}</ul> : <p className="mt-2 text-xs text-forest-800/60">No overdue or failed job.</p>}</> : <Empty>No runtime database configured.</Empty>}
        </Card>
      </div>
    </main>
  );
}
