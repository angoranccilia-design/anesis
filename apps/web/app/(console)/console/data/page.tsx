import { consoleContext, latest, imports, registers, properties, health, declaredSpec } from "@/lib/console/data";
import { Card, Pill, Empty, DemoBanner, when } from "@/components/console/ui";
import { VerifyConnectors } from "@/components/console/VerifyConnectors";
export const dynamic = "force-dynamic";
export const metadata = { title: "Data & Connectors — Anesis" };

/** F. Data and connectors: the declared property, every import with its verdict and recency, the registers (benchmarks with sources, events, studies), the connector states, the system health. */
export default async function DataPage() {
  const ctx = await consoleContext(); const [r, imps, regs, props, h, spec] = await Promise.all([latest(), imports(), registers(), properties(), health(), declaredSpec()]);
  return (
    <main>
      <DemoBanner demo={ctx.demo} simulated={ctx.simulatedProperty} />
      <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">Data & Connectors</p><h1 className="font-serif text-4xl">What Anesis actually holds</h1></div><VerifyConnectors /></div>
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card eyebrow="Property" title={spec.name}>
          <ul className="text-sm"><li>id <span className="font-mono">{spec.id}</span></li><li>type {spec.type} · {spec.rooms} rooms (declared)</li><li>location {spec.location.name} ({spec.location.lat}, {spec.location.lon}) — declared, no geocoding</li></ul>
          <p className="mt-2 text-xs text-forest-800/60">{props.length} propert{props.length === 1 ? "y" : "ies"} declared in the runtime.</p>
        </Card>
        <Card eyebrow="Registers" title="Declared by the operator">
          <p className="text-sm"><strong>Benchmarks with a source:</strong> {Object.keys(regs.benchmarks ?? {}).length}</p><ul className="text-xs">{Object.entries(regs.benchmarks ?? {}).map(([k, b]) => <li key={k}><span className="font-mono">{k}</span> = {b.value} — {b.source} ({b.asOf})</li>)}</ul>
          <p className="mt-2 text-sm"><strong>Studies carried out:</strong> {Object.keys(regs.informationObtained ?? {}).length}</p><ul className="text-xs">{Object.entries(regs.informationObtained ?? {}).map(([k, s]) => <li key={k}><span className="font-mono">{k}</span>: {s.study} — {s.source}</li>)}</ul>
          <p className="mt-2 text-sm"><strong>Events:</strong> {regs.events.length} · <strong>competitors:</strong> {regs.competitors.length} · <strong>partnership terms:</strong> {regs.partnership ? "on record" : "none"}</p>
          <p className="mt-2 text-xs text-forest-800/60">Edited with the runtime CLI (`register`) or the registers API.</p>
        </Card>
        <Card eyebrow="System" title={h ? (h.ok ? "Healthy" : "Attention") : "No runtime database"}>
          {h ? <><p className="text-sm">backend {h.backend}{ctx.demo ? " · in-memory demo (resets on restart)" : ""}</p>{h.problems.length ? <ul className="mt-1 text-xs text-amber-900">{h.problems.map((p) => <li key={p}>• {p}</li>)}</ul> : <p className="mt-1 text-xs text-forest-800/60">no overdue or failed job</p>}</> : <Empty>Configure DATABASE_URL or ANESIS_PGLITE_DIR.</Empty>}
        </Card>
      </div>
      <Card className="mt-6" eyebrow="Imports" title={`${imps.length} PMS export${imps.length === 1 ? "" : "s"}`}>
        {imps.length ? <div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="text-left text-forest-800/60"><th className="py-1 pr-3">file</th><th className="pr-3">period</th><th className="pr-3">window</th><th className="pr-3">rows kept</th><th className="pr-3">verdict</th><th className="pr-3">imported</th><th>recency · what it cannot compute</th></tr></thead><tbody>{imps.map((i) => <tr key={i.id} className="border-t border-forest-900/5 align-top"><td className="py-1 pr-3"><span className="font-medium">{i.filename}</span><br /><span className="font-mono text-[10px] text-forest-800/50">{i.sha256.slice(0, 16)}</span></td><td className="pr-3">{i.periodFrom} → {i.periodTo}</td><td className="pr-3">{i.windowCls ?? "—"}</td><td className="pr-3">{i.kept}/{i.rows}</td><td className="pr-3"><Pill v={i.verdict === "SUFFICIENT_FOR_OCCUPANCY_AND_ADR" ? "VERIFIED" : i.verdict === "WINDOW_TOO_SHORT" ? "BLOCKED" : "PARTIAL"} title={i.verdict} /> <span>{i.verdict.replace(/_/g, " ").toLowerCase()}</span></td><td className="pr-3">{when(i.importedAt)}</td><td className="text-forest-800/70">{i.recency}<br />{i.cannot.map((c) => `${c.metric}: ${c.because}`).join(" · ")}{i.nextData.length ? <><br /><span className="text-gold-deep">next: {i.nextData.join("; ")}</span></> : null}</td></tr>)}</tbody></table></div> : <Empty>No import yet. Run an assay with a reservations export.</Empty>}
      </Card>
      <Card className="mt-6" eyebrow="Connectors" title="State at the latest cycle">
        {r ? <div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="text-left text-forest-800/60"><th className="py-1 pr-3">connector</th><th className="pr-3">provider</th><th className="pr-3">kind</th><th className="pr-3">status</th><th className="pr-3">last fetched</th><th className="pr-3">needs</th><th>note</th></tr></thead><tbody>{r.context.connectors.map((c) => <tr key={c.id} className="border-t border-forest-900/5 align-top"><td className="py-1 pr-3 font-mono">{c.id}</td><td className="pr-3">{c.provider}</td><td className="pr-3">{c.kind}</td><td className="pr-3"><Pill v={c.status} /></td><td className="pr-3">{when(c.lastFetchedAt)}</td><td className="pr-3 font-mono text-[10px]">{c.requires.join(", ") || "—"}</td><td className="text-forest-800/70">{c.statusNote}</td></tr>)}</tbody></table></div> : <Empty>No cycle yet.</Empty>}
        <p className="mt-2 text-xs text-forest-800/60">Credential names are shown so the operator knows what to provide; their values are never displayed.</p>
      </Card>
    </main>
  );
}
