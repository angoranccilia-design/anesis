import { agentTeam, SAMPLE_ACTIVITY } from "@/lib/agents";
import { TeamHub } from "@/components/studio/TeamHub";

export const metadata = { title: "Anesis Studio — your team of AI specialists" };
export const dynamic = "force-dynamic";

/**
 * Prévisualisation publique du hub « Anesis Studio » (Phase 1). Le vrai cockpit fondatrice
 * (protégé par connexion) réutilisera ces mêmes composants une fois l'auth active.
 */
export default function TeamPreviewPage() {
  return <TeamHub agents={agentTeam()} activity={[...SAMPLE_ACTIVITY]} />;
}
