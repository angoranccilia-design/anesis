import "server-only";
import { authorize, type PolicyOutcome } from "@anesis/policy";
import { iso, type AutonomyTier, type ToolCallRecord } from "@anesis/core";
import { classifyCommand, LEVEL_NAME, type CommandClass } from "@anesis/engine";

/**
 * Every intent that reaches the engine from a human channel (typed or spoken) is authorised by the
 * existing policy engine before anything runs. Brief §28 levels map onto the repository's tiers:
 *   read / simulate / compare      → T0 (internal, immediate)
 *   fund or execute an intervention → T3 (blocking human approval) — never executed by this application
 * Voice does not bypass this: the voice route calls the same function.
 */
export type IntentKind = "ask" | "run_cycle" | "reset" | "compare" | "change_assumptions" | "fund" | "execute" | "unknown";

const TIER: Record<IntentKind, AutonomyTier> = { ask: "T0", run_cycle: "T0", reset: "T0", compare: "T0", change_assumptions: "T0", fund: "T3", execute: "T3", unknown: "T0" };

export function authoriseIntent(kind: IntentKind, input: unknown): { outcome: PolicyOutcome; tier: AutonomyTier } {
  const tier = TIER[kind];
  const record: ToolCallRecord = {
    name: `engine.${kind}`, tier, input, output: null, at: iso(),
    approvalId: null, approvedBy: null, approvedAt: null, retentionStartedAt: null,
    reversible: tier === "T0", compensation: tier === "T0" ? null : "no external effect: the application does not execute interventions; a human would",
  };
  return { outcome: authorize(record, { globalStop: process.env.ANESIS_EMERGENCY_STOP === "1", mandateStopped: false }), tier };
}

/** Free-text command (typed or spoken) → engine risk classification (L0–L4, amount-aware) → policy decision. */
export function authoriseCommand(text: string, input: unknown): { command: CommandClass; levelName: string; outcome: PolicyOutcome } {
  const command = classifyCommand(text);
  const record: ToolCallRecord = { name: `engine.command.${command.kind}`, tier: command.tier, input, output: null, at: iso(), approvalId: null, approvedBy: null, approvedAt: null, retentionStartedAt: null, reversible: command.level <= 1, compensation: command.level >= 2 ? "no external effect: the application does not execute; a human would" : null };
  return { command, levelName: LEVEL_NAME[command.level], outcome: authorize(record, { globalStop: process.env.ANESIS_EMERGENCY_STOP === "1", mandateStopped: false }) };
}
