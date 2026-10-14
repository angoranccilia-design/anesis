import { consoleContext } from "@/lib/console/data";
import { DemoBanner } from "@/components/console/ui";
import { InterventionsBoard } from "@/components/console/InterventionsBoard";
import { guardApi } from "@/lib/guard";
export const dynamic = "force-dynamic";
export const metadata = { title: "Interventions — Anesis" };
export default async function InterventionsPage() {
  const ctx = await consoleContext(); const g = await guardApi(); const canAct = g.ok && g.mode !== "demo";
  return <main><DemoBanner demo={ctx.demo} simulated={ctx.simulatedProperty} /><p className="eyebrow">Interventions</p><h1 className="font-serif text-4xl">Recommendation → approval → execution → measurement</h1><p className="mb-6 mt-1 text-sm text-forest-800/70">Every contract is prepared by the engine from a cycle, frozen by its origin hash, and moved only by governed transitions recorded under the signed-in operator. Nothing is sent to any external system.</p><InterventionsBoard canAct={canAct} /></main>;
}
