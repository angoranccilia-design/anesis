import { EngineConsole } from "@/components/engine/EngineConsole";
import { latestRun } from "@/lib/engine/store";

export const metadata = { title: "The Core — Anesis Commercial Intelligence System" };
export const dynamic = "force-dynamic";

/** The engine console. Server-rendered with the latest real run (if any); nothing is pre-filled otherwise. */
export default function EnginePage() {
  const run = latestRun();
  return <EngineConsole initial={run ? JSON.parse(JSON.stringify(run)) : null} />;
}
