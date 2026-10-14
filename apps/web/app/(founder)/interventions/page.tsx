import { InterventionsPanel } from "@/components/interventions/InterventionsPanel";
export const metadata = { title: "Interventions — Anesis" };
export const dynamic = "force-dynamic";
/** Contracts of the property served by this console. Needs the runtime database; without it the panel says so. */
export default function InterventionsPage() { return <InterventionsPanel />; }
