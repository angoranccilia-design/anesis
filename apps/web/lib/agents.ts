/**
 * Vue « équipe » du cockpit — les 12 agents métier (ROSTER core) présentés pour la fondatrice :
 * ce que fait chaque agent + son niveau d'autonomie (dérivé de TIER_POLICY). Aucune donnée inventée :
 * rôle et tier viennent du domaine ; la description est un libellé d'interface (en-GB).
 */
import { ROSTER, TIER_POLICY, type AgentId, type AutonomyTier, type AutonomyRegime } from "@anesis/core";

/** Prénom « employé » de chaque agent — pour l'humaniser dans le hub. */
const NAME: Record<AgentId, string> = {
  analyst: "Nora",
  underwriter: "Victor",
  orchestrator: "Chase",
  "social-ops": "Olivia",
  conversion: "Liam",
  reputation: "Anna",
  partnerships: "Lucas",
  lifecycle: "Grace",
  "media-buyer": "Marcus",
  "rate-distribution": "David",
  "content-creator": "Julie",
  "art-director": "Camille",
};

/** Ce que fait chaque agent, en une phrase (en-GB). */
const WHAT: Record<AgentId, string> = {
  analyst: "Reads each hotel's public data and scores the Revenue Leak Index.",
  underwriter: "Turns the assessment into the priced Acquisition Thesis and 90-day plan.",
  orchestrator: "Assigns the recovery work to the right agents from the thesis objectives.",
  "social-ops": "Publishes and manages Instagram, Facebook and TikTok, and answers messages.",
  conversion: "Improves the direct booking path and on-site conversion.",
  reputation: "Monitors and replies to reviews across Google, Booking and TripAdvisor.",
  partnerships: "Builds local partnerships that feed direct demand.",
  lifecycle: "Runs guest email — newsletters and win-back sequences.",
  "media-buyer": "Runs Meta and Google Ads to capture demand before the OTAs.",
  "rate-distribution": "Enforces rate parity and rebalances the channel mix away from OTAs.",
  "content-creator": "Produces the conversion video and content from the brief.",
  "art-director": "Sets the brand universe and creative direction for the mandate.",
};

/** Traduction du régime d'autonomie en langage clair pour la fondatrice. */
const REGIME_LABEL: Record<AutonomyRegime, string> = {
  immediate: "Runs on its own",
  immediate_post_review: "Acts, you review after",
  retention_window: "Acts after a 2-hour hold you can stop",
  blocking_approval: "Needs your approval first",
};

/** Regroupement logique pour l'affichage (l'ordre est celui du parcours d'un mandat). */
export type AgentGroup = "Assess & plan" | "Win the booking" | "Presence & creative" | "Keep & grow";

const GROUP: Record<AgentId, AgentGroup> = {
  analyst: "Assess & plan",
  underwriter: "Assess & plan",
  orchestrator: "Assess & plan",
  "media-buyer": "Win the booking",
  conversion: "Win the booking",
  "rate-distribution": "Win the booking",
  "social-ops": "Presence & creative",
  "content-creator": "Presence & creative",
  "art-director": "Presence & creative",
  reputation: "Keep & grow",
  lifecycle: "Keep & grow",
  partnerships: "Keep & grow",
};

export const AGENT_GROUPS: readonly AgentGroup[] = ["Assess & plan", "Win the booking", "Presence & creative", "Keep & grow"];

export interface AgentCard {
  readonly id: AgentId;
  readonly name: string;
  readonly initials: string;
  readonly photo: string;
  readonly role: string;
  readonly tier: AutonomyTier;
  readonly what: string;
  readonly autonomy: string;
  readonly external: boolean;
  readonly group: AgentGroup;
}

export function agentTeam(): AgentCard[] {
  return (Object.keys(ROSTER) as AgentId[]).map((id) => {
    const tier = ROSTER[id].defaultTier;
    const policy = TIER_POLICY[tier];
    const name = NAME[id];
    return {
      id,
      name,
      initials: name.slice(0, 1) + ROSTER[id].role.slice(0, 1),
      photo: `/img/agents/${id}.jpg`,
      role: ROSTER[id].role,
      tier,
      what: WHAT[id],
      autonomy: REGIME_LABEL[policy.regime],
      external: policy.external,
      group: GROUP[id],
    };
  });
}

/** Exemples d'activité « en direct » pour le fil du hub (Phase 1 — remplacé par le vrai flux ensuite). */
export interface ActivityItem {
  readonly agent: string;
  readonly initials: string;
  readonly text: string;
}
/** Les 5 niveaux d'autonomie, en langage clair (mappés sur les tiers T0–T5). */
export interface AutonomyLevel {
  readonly n: number;
  readonly label: string;
  readonly meaning: string;
  readonly tiers: string;
}
export const AUTONOMY_LEVELS: readonly AutonomyLevel[] = [
  { n: 1, label: "Autonomous", meaning: "Runs on its own — internal only.", tiers: "T0" },
  { n: 2, label: "Post-review", meaning: "Acts, then you review.", tiers: "T1" },
  { n: 3, label: "Grace window", meaning: "Acts after a 2-hour hold you can stop.", tiers: "T2" },
  { n: 4, label: "Prior approval", meaning: "Waits for your approval before acting.", tiers: "T3–T4" },
  { n: 5, label: "Reserved decision", meaning: "Only you decide.", tiers: "T5" },
];

/** Entrées illustratives du journal d'audit en ajout seul (le vrai vient de la table `events`). */
export interface AuditSample {
  readonly agent: string;
  readonly initials: string;
  readonly action: string;
  readonly tier: string;
  readonly reversible: boolean;
  readonly ago: string;
}
export const AUDIT_SAMPLE: readonly AuditSample[] = [
  { agent: "David", initials: "DR", action: "rate.parity.corrected — closed an OTA undercut for 2 Aug", tier: "T4", reversible: true, ago: "3m" },
  { agent: "Marcus", initials: "MM", action: "ads.budget.shifted — +£300 to branded search", tier: "T4", reversible: true, ago: "18m" },
  { agent: "Anna", initials: "AR", action: "review.replied — Google, 5★", tier: "T2", reversible: true, ago: "41m" },
  { agent: "Olivia", initials: "OS", action: "post.scheduled — Instagram + TikTok", tier: "T1", reversible: true, ago: "1h" },
  { agent: "Nora", initials: "NA", action: "assessment.scored — Leak Index 61/100", tier: "T0", reversible: false, ago: "2h" },
  { agent: "Julie", initials: "JC", action: "content.drafted — 4 Reels, awaiting your approval", tier: "T5", reversible: true, ago: "3h" },
];

export const SAMPLE_ACTIVITY: readonly ActivityItem[] = [
  { agent: "Marcus", initials: "MM", text: "Optimised the Meta campaign — cost per direct booking down 12% this week." },
  { agent: "Anna", initials: "AR", text: "Replied to 3 new Google reviews in under an hour. Rating holding at 4.6★." },
  { agent: "David", initials: "DR", text: "Caught an OTA undercut on 2 Aug and closed the parity gap." },
  { agent: "Julie", initials: "JC", text: "Drafted 4 Reels from the last shoot — ready for your approval." },
  { agent: "Grace", initials: "GL", text: "Sent the monthly newsletter to 2,140 past guests. 11 direct bookings so far." },
  { agent: "Nora", initials: "NA", text: "Finished the Leak Index for a new enquiry — scored 61/100, worth a thesis." },
  { agent: "Liam", initials: "LC", text: "Shipped a faster mobile checkout — completion up from 12.5% to 16%." },
  { agent: "Olivia", initials: "OS", text: "Scheduled this week's posts across Instagram, Facebook and TikTok." },
];

