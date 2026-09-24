/**
 * HUMAN GOVERNANCE — risk-based autonomy levels, and the classification of free-text commands.
 *   L0 OBSERVE · L1 REVERSIBLE LOW-RISK ACTION · L2 PREPARE / RECOMMEND · L3 HUMAN APPROVAL REQUIRED · L4 HUMAN DECISION ONLY
 * Mapped onto the repository's autonomy tiers: L0→T0, L1→T1, L2→T2, L3→T3, L4→T5.
 * A sentence never executes an L3/L4 action: the classifier's output is fed to @anesis/policy.authorize(), which
 * returns require_approval without a recorded Approval. This applies identically to voice and text.
 */
export type Level = 0 | 1 | 2 | 3 | 4;
export type Tier = "T0" | "T1" | "T2" | "T3" | "T4" | "T5";
export const LEVEL_TIER: Record<Level, Tier> = { 0: "T0", 1: "T1", 2: "T2", 3: "T3", 4: "T5" };
export const LEVEL_NAME: Record<Level, string> = { 0: "OBSERVE", 1: "REVERSIBLE LOW-RISK ACTION", 2: "PREPARE / RECOMMEND", 3: "HUMAN APPROVAL REQUIRED", 4: "HUMAN DECISION ONLY" };
export const AUTONOMOUS_SPEND_LIMIT_GBP = 0;          // the system commits no money on its own (declared)
export const HUMAN_DECISION_ONLY_GBP = 50_000;         // above this, not even an approval flow: the owner decides (declared)

export interface CommandClass { readonly kind: "read" | "simulate" | "prepare" | "reversible" | "commit" | "irreversible"; readonly level: Level; readonly tier: Tier; readonly amountGbp: number | null; readonly reason: string }

export function parseAmountGbp(text: string): number | null {
  const m = /(?:£|gbp\s*)\s*([\d][\d,.]*)\s*(k|m)?|([\d][\d,.]*)\s*(k)?\s*(?:£|gbp|pounds|livres)/i.exec(text);
  if (!m) return null;
  const raw = (m[1] ?? m[3] ?? "").replace(/,/g, ""); const mult = (m[2] ?? m[4] ?? "").toLowerCase();
  const n = Number(raw); if (!Number.isFinite(n)) return null;
  return mult === "k" ? n * 1_000 : mult === "m" ? n * 1_000_000 : n;
}

export function classifyCommand(text: string): CommandClass {
  const s = text.toLowerCase(); const amount = parseAmountGbp(s);
  const commit = /\b(launch|spend|fund|approve|pay|buy|book|sign|commit|go ahead|start the campaign|increase (the )?(spend|budget)|lance|dépense|finance|approuve|paie|achète|signe|engage|augmente (le )?budget)\b/.test(s);
  const irreversible = /\b(cancel (the )?contract|terminate|close the property|delete|supprime|résilie|ferme)\b/.test(s);
  const reversible = /\b(pause|resume|draft|schedule a post|reply to (the )?review|met en pause|reprends|brouillon)\b/.test(s);
  const prepare = /\b(prepare|recommend|plan|propose|prépare|recommande|propose)\b/.test(s);
  const simulate = /\b(run|simulate|scenario|compare|rerun|lance (le|un) (cycle|scénario)|simule|compare)\b/.test(s);
  if (irreversible || (amount !== null && amount >= HUMAN_DECISION_ONLY_GBP)) return { kind: "irreversible", level: 4, tier: "T5", amountGbp: amount, reason: amount !== null && amount >= HUMAN_DECISION_ONLY_GBP ? `financial commitment £${amount.toLocaleString("en-GB")} ≥ £${HUMAN_DECISION_ONLY_GBP.toLocaleString("en-GB")}: human decision only` : "irreversible external action: human decision only" };
  // A question that mentions money is a question ("where should we put the next £20,000?"), not a commitment.
  const interrogative = /\?\s*$/.test(s) || /^(where|what|which|why|how|should|could|would|can|do|does|is|are|où|que|quel|quelle|comment|pourquoi|est-ce)\b/.test(s.trim());
  if (commit || (amount !== null && amount > AUTONOMOUS_SPEND_LIMIT_GBP && !interrogative)) return { kind: "commit", level: 3, tier: "T3", amountGbp: amount, reason: amount !== null ? `financial commitment £${amount.toLocaleString("en-GB")} exceeds the autonomous execution threshold (£${AUTONOMOUS_SPEND_LIMIT_GBP})` : "financial or contractual commitment: human approval required" };
  if (reversible) return { kind: "reversible", level: 1, tier: "T1", amountGbp: amount, reason: "reversible, low-risk external action: executes with post-review" };
  if (prepare) return { kind: "prepare", level: 2, tier: "T2", amountGbp: amount, reason: "preparation or recommendation: retained for review before anything external happens" };
  if (simulate) return { kind: "simulate", level: 0, tier: "T0", amountGbp: amount, reason: "internal computation: no external effect" };
  return { kind: "read", level: 0, tier: "T0", amountGbp: amount, reason: "read-only" };
}
