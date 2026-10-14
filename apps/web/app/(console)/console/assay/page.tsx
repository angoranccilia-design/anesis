import Link from "next/link";
import { consoleContext, runs } from "@/lib/console/data";
import { Card, Pill, Empty, DemoBanner, gbp, when } from "@/components/console/ui";
import { AssayForm } from "@/components/console/AssayForm";
export const dynamic = "force-dynamic";
export const metadata = { title: "Assay — Anesis" };
/** G. Launch an analysis and find every past cycle with what led to its conclusions. */
export default async function AssayPage() {
  const ctx = await consoleContext(); const all = [...(await runs())].reverse();
  return (
    <main>
      <DemoBanner demo={ctx.demo} simulated={ctx.simulatedProperty} />
      <p className="eyebrow">Assay</p><h1 className="font-serif text-4xl">Run a commercial analysis</h1>
      <p className="mb-6 mt-1 text-sm text-forest-800/70">Import a reservations export, run one decision cycle under the verified-only policy, read what the data could establish and what they could not. Under 90 days nothing is annualised; under a full year annual totals are projections and say so.</p>
      <AssayForm demo={ctx.demo} />
      <Card className="mt-6" eyebrow="Cycles" title={`${all.length} run${all.length === 1 ? "" : "s"} on record`}>
        {all.length ? <table className="w-full text-sm"><thead><tr className="text-left text-xs text-forest-800/60"><th className="py-1 pr-3">run</th><th className="pr-3">when</th><th className="pr-3">label</th><th className="pr-3">policy</th><th className="pr-3">binding</th><th className="pr-3">selected</th><th className="pr-3">attainable</th><th>trace</th></tr></thead><tbody>{all.map((r) => <tr key={r.id} className="border-t border-forest-900/5"><td className="py-1 pr-3 font-mono text-xs">{r.id}</td><td className="pr-3 text-xs">{when(r.createdAt)}</td><td className="pr-3 text-xs">{r.label}</td><td className="pr-3"><Pill v={r.result.diagnosis.evidencePolicy === "verified_only" ? "VERIFIED" : "SIMULATED"} title={r.result.diagnosis.evidencePolicy} /></td><td className="pr-3 text-xs">{r.result.diagnosis.binding ?? "none"}</td><td className="pr-3 text-xs">{r.result.decision.selected.join(", ") || "—"}</td><td className="pr-3 text-xs">{gbp(r.result.diagnosis.attainableGbp)}</td><td className="text-xs"><Link className="link-underline" href={`/console/constraint?run=${r.id}`}>constraint</Link> · <Link className="link-underline" href={`/console/decision?run=${r.id}`}>decision</Link></td></tr>)}</tbody></table> : <Empty>No cycle yet.</Empty>}
      </Card>
    </main>
  );
}
