import { consoleContext, latest } from "@/lib/console/data";
import { Card, Pill, Empty, DemoBanner, gbp, when } from "@/components/console/ui";
import { VerifyConnectors } from "@/components/console/VerifyConnectors";
export const dynamic = "force-dynamic";
export const metadata = { title: "External Intelligence — Anesis" };

/** C. External intelligence: the signals actually fetched in the latest cycle, each with source, date and real status. Nothing simulated is shown as live. */
export default async function IntelligencePage() {
  const ctx = await consoleContext(); const r = await latest();
  if (!r) return <main><DemoBanner demo={ctx.demo} simulated={ctx.simulatedProperty} /><Empty>No cycle yet.</Empty></main>;
  const c = r.context; const live = c.connectors.filter((x) => x.kind === "live"); const others = c.connectors.filter((x) => x.kind !== "live");
  return (
    <main>
      <DemoBanner demo={ctx.demo} simulated={ctx.simulatedProperty} />
      <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">External Intelligence</p><h1 className="font-serif text-4xl">Signals as fetched for cycle {r.id}</h1><p className="mt-1 text-sm text-forest-800/70">Context fetched {when(c.fetchedAt)}{r.input ? "" : ""}. {c.connectors.filter((x) => x.status === "CONNECTED").length} live sources answered; a source that did not answer shows DATA UNAVAILABLE and contributed nothing.</p></div><VerifyConnectors /></div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card eyebrow="Live sources" title="Called in this cycle">
          <ul className="space-y-2 text-sm">{live.map((x) => <li key={x.id} className="rounded-lg border border-forest-900/10 px-3 py-2"><div className="flex items-center justify-between"><span><span className="font-mono text-xs">{x.id}</span> · {x.provider}</span><Pill v={x.status} /></div><p className="mt-1 text-xs text-forest-800/70">{x.statusNote} · freshness {x.freshness} · fetched {when(x.lastFetchedAt)}</p></li>)}</ul>
        </Card>
        <Card eyebrow="Declared and contracted" title="Not fetched">
          <ul className="space-y-1 text-xs">{others.map((x) => <li key={x.id} className="flex items-center justify-between gap-2 border-b border-forest-900/5 py-1"><span><span className="font-mono">{x.id}</span> · {x.provider}</span><Pill v={x.status} title={x.statusNote} /></li>)}</ul>
          <p className="mt-2 text-xs text-forest-800/60">Contracts name the provider and the credentials they would need; no adapter exists for them yet, and they never produce a value.</p>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card eyebrow="Weather" title={c.weather ? `${c.weather.provider}` : "No forecast"}>
          {c.weather ? <><p className="text-xs text-forest-800/70">{c.weather.location.name} · issued {when(c.weather.issuedAt)} · {c.weather.days.length} days</p><table className="mt-2 w-full text-xs"><thead><tr className="text-left text-forest-800/60"><th>date</th><th>max °C</th><th>min °C</th><th>rain mm</th><th>wind km/h</th><th>sun h</th></tr></thead><tbody>{c.weather.days.map((d) => <tr key={d.date} className="border-t border-forest-900/5"><td className="py-0.5">{d.date}</td><td>{d.tMaxC.toFixed(0)}</td><td>{d.tMinC.toFixed(0)}</td><td>{d.precipitationMm.toFixed(1)}</td><td>{d.windMaxKmh.toFixed(0)}</td><td>{d.sunshineHours === null ? "—" : d.sunshineHours.toFixed(1)}</td></tr>)}</tbody></table></> : <Empty>The weather source did not answer in this cycle.</Empty>}
        </Card>
        <Card eyebrow="Macro indicators" title={`${c.macro.length} indicators`}>
          {c.macro.length ? <ul className="space-y-2 text-sm">{c.macro.map((m) => <li key={m.id} className="rounded-lg border border-forest-900/10 px-3 py-2"><div className="flex items-center justify-between"><span>{m.name}</span><span className="font-serif text-xl">{m.value} <span className="text-xs">{m.unit}</span></span></div><p className="text-xs text-forest-800/60">as of {m.asOf.slice(0, 10)} · {m.source} · <Pill v={m.status} /></p></li>)}</ul> : <Empty>No macro indicator fetched.</Empty>}
          <h3 className="mt-4 eyebrow">Public holidays (next)</h3>
          <ul className="mt-1 text-xs">{c.holidays.filter((h) => h.date >= c.fetchedAt.slice(0, 10)).slice(0, 6).map((h) => <li key={h.date}>{h.date} · {h.name} <span className="text-forest-800/50">({h.source})</span></li>)}{!c.holidays.length && <li className="text-forest-800/60">none fetched</li>}</ul>
        </Card>
        <Card eyebrow="Events and competitors" title="Operator-entered">
          {c.events.length ? <ul className="space-y-1 text-sm">{c.events.map((e) => <li key={e.id} className="rounded-lg border border-forest-900/10 px-3 py-2"><span className="font-medium">{e.name}</span> <Pill v="OPERATOR_ENTERED" /><p className="text-xs text-forest-800/70">{e.start} → {e.end} · {e.venue} · {e.distanceKm ?? "?"} km · {e.expectedAttendance?.toLocaleString("en-GB") ?? "?"} attendees · {e.source}</p></li>)}</ul> : <Empty>No event on record. Events come from the operator register or, later, an events API (Ticketmaster, PredictHQ: not connected).</Empty>}
          <p className="mt-3 text-xs text-forest-800/60">Competitor rates: {c.competitors.length ? `${c.competitors.length} operator observations` : "none (no rate-shopping licence; nothing scraped)"}.</p>
        </Card>
      </div>

      <Card className="mt-6" eyebrow="What the engine made of them" title={`${r.result.signals.length} signals → ${r.result.assessments.length} assessments → ${r.result.fused.length} verdicts`}>
        {r.result.fused.length ? <ul className="space-y-2 text-sm">{r.result.fused.map((f) => <li key={f.id} className={`rounded-lg px-3 py-2 ${f.verdict === "FORWARD_EXPOSURE" || f.verdict === "COMMERCIAL_OPPORTUNITY" ? "bg-amber-50" : "bg-cream-100"}`}><div className="flex items-center justify-between"><span className="font-medium">{f.scope} · {f.domains.join(", ")}</span><span className="text-xs">{f.verdict.replace(/_/g, " ")} · {gbp(f.combinedEffectGbp.low)} – {gbp(f.combinedEffectGbp.high)}</span></div><p className="mt-1 text-xs text-forest-800/80">{f.statement}</p></li>)}</ul> : <Empty>No external verdict in this cycle.</Empty>}
        <p className="mt-3 text-xs text-forest-800/60">A verdict tests whether the decision would change under the signal; today it alerts and is recorded. It does not move the allocation by itself (documented limit).</p>
      </Card>
    </main>
  );
}
