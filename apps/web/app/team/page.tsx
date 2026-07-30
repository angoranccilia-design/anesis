import { agentTeam, SAMPLE_ACTIVITY, AUTONOMY_LEVELS, AUDIT_SAMPLE } from "@/lib/agents";
import { TeamHub } from "@/components/studio/TeamHub";

export const metadata = { title: "Anesis Office — your team of AI specialists" };
export const dynamic = "force-dynamic";

/**
 * Prévisualisation publique du hub « Anesis Studio » (Phase 1–2). Le vrai cockpit fondatrice
 * (protégé par connexion) réutilise ces composants + le journal d'audit réel (table `events`).
 */
export default function TeamPreviewPage() {
  return (
    <TeamHub
      agents={agentTeam()}
      activity={[...SAMPLE_ACTIVITY]}
      autonomy={[...AUTONOMY_LEVELS]}
      audit={[...AUDIT_SAMPLE]}
    />
  );
}
