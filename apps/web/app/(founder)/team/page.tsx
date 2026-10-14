import { agentTeam, AUTONOMY_LEVELS, type ActivityItem, type AuditSample } from "@/lib/agents";
import { TeamHub } from "@/components/studio/TeamHub";
import { listRuns } from "@/lib/engine/store";

export const metadata = { title: "Anesis Office — your team of AI specialists" };
export const dynamic = "force-dynamic";

/**
 * Hub « Anesis Studio ». Le fil d'activité et le journal d'audit viennent des cycles de décision réellement
 * exécutés par le moteur dans ce processus ; s'il n'y en a pas, ils sont vides et le disent.
 */
export default function TeamPreviewPage() {
  const runs = listRuns();
  const activity: ActivityItem[] = runs.flatMap((r) => r.result.events.map((e) => ({ agent: "Engine", initials: e.state.slice(0, 2), text: `${e.type} — ${e.detail}`, at: e.at }))).reverse().slice(0, 8);
  const audit: AuditSample[] = runs.map((r) => ({ agent: "Engine", initials: "EN", action: `${r.result.decision.id} — selected ${r.result.decision.selected.join(", ") || "nothing"}; rejected ${r.result.decision.rejected.map((x) => x.id).join(", ") || "none"}`, tier: r.result.decision.governance.level <= 1 ? "T0" : "T2", reversible: true, ago: r.createdAt.slice(11, 19) + " UTC" })).reverse();
  return <TeamHub agents={agentTeam()} activity={activity} autonomy={[...AUTONOMY_LEVELS]} audit={audit} />;
}
