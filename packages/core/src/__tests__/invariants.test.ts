import { describe, expect, it } from "vitest";
import {
  checkAgentRun,
  checkArtifact,
  checkNotification,
  checkObjective,
  checkTask,
  checkToolCall,
  checkToolCallAgainstApproval,
} from "../invariants.js";
import { RETENTION_WINDOW_MS } from "../autonomy.js";
import { iso, isoOffset } from "../primitives.js";
import { asId } from "../unsafe.js";
import type { ApprovalId, LossLineId, ObjectiveId, OperatorId } from "../primitives.js";
import { aNotification, anApproval, anArtifact, anObjective, aRun, aTask, aToolCall } from "./factories.js";

const APPROVAL = asId<ApprovalId>("approval-1");

const codesOf = (r: ReturnType<typeof checkAgentRun>): string[] => (r.ok ? [] : r.violations.map((v) => v.code));

const OP = asId<OperatorId>("op-cecilia");

describe("Objective — trace vers un £ chiffré", () => {
  it("valide avec une lossLineId", () => {
    expect(checkObjective(anObjective()).ok).toBe(true);
  });
  it("invalide sans lossLineId", () => {
    expect(checkObjective(anObjective({ lossLineId: asId<LossLineId>("") })).ok).toBe(false);
  });
});

describe("Task / Artifact / Notification", () => {
  it("Task exige objectiveId et mandateId", () => {
    expect(checkTask(aTask()).ok).toBe(true);
    expect(checkTask(aTask({ objectiveId: asId<ObjectiveId>("") })).ok).toBe(false);
  });
  it("Artifact exige un run producteur", () => {
    expect(checkArtifact(anArtifact()).ok).toBe(true);
  });
  it("Notification exige une action attendue non vide", () => {
    expect(checkNotification(aNotification()).ok).toBe(true);
    expect(checkNotification(aNotification({ expectedAction: "   " })).ok).toBe(false);
  });
});

describe("ToolCall — réversibilité (correction 3)", () => {
  it("une action T2 sans compensation est invalide", () => {
    const at = iso();
    const noComp = aToolCall({ tier: "T2", compensation: null, retentionStartedAt: isoOffset(at, -RETENTION_WINDOW_MS - 1000), at });
    expect(codesOf(checkToolCall(noComp))).toContain("TOOLCALL_COMPENSATION");
  });

  it("`reversible: true` sans compensation est invalide même en T1", () => {
    const bad = aToolCall({ tier: "T1", reversible: true, compensation: null });
    expect(codesOf(checkToolCall(bad))).toContain("TOOLCALL_COMPENSATION");
  });

  it("`reversible: false` en T0 sans compensation reste valide", () => {
    expect(checkToolCall(aToolCall({ tier: "T0", reversible: false, compensation: null })).ok).toBe(true);
  });
});

describe("ToolCall — fenêtre de retenue T2 (correction 2)", () => {
  it("T2 exécutée +10 min après le début de la retenue → échec", () => {
    const at = iso();
    const tooSoon = aToolCall({
      tier: "T2",
      compensation: "supprimer le post programmé",
      retentionStartedAt: isoOffset(at, -10 * 60 * 1000),
      at,
    });
    expect(codesOf(checkToolCall(tooSoon))).toContain("TOOLCALL_RETENTION_WINDOW");
  });

  it("T2 sans retentionStartedAt → échec", () => {
    const t2 = aToolCall({ tier: "T2", compensation: "x", retentionStartedAt: null });
    expect(codesOf(checkToolCall(t2))).toContain("TOOLCALL_RETENTION_WINDOW");
  });

  it("T2 exécutée +2 h 01 après → succès", () => {
    const at = iso();
    const ok2 = aToolCall({
      tier: "T2",
      compensation: "supprimer le post programmé",
      retentionStartedAt: isoOffset(at, -(RETENTION_WINDOW_MS + 60 * 1000)),
      at,
    });
    expect(checkToolCall(ok2).ok).toBe(true);
  });
});

describe("ToolCall — approbation prouvée antérieure (correction 1)", () => {
  it("T4 sans approbation → échec", () => {
    const t4 = aToolCall({ tier: "T4", compensation: "mettre la campagne en pause", approvedBy: null, approvedAt: null });
    expect(codesOf(checkToolCall(t4))).toContain("TOOLCALL_APPROVAL");
  });

  it("T4 dont l'approbation est POSTÉRIEURE à l'exécution → échec (TOOLCALL_APPROVAL_ORDER)", () => {
    const at = iso();
    const late = aToolCall({
      tier: "T4",
      compensation: "mettre la campagne en pause",
      approvedBy: OP,
      approvedAt: isoOffset(at, 5 * 60 * 1000), // approuvé 5 min APRÈS l'exécution
      at,
    });
    expect(codesOf(checkToolCall(late))).toContain("TOOLCALL_APPROVAL_ORDER");
  });

  it("T4 sans lien vers une Approval (approvalId null) → échec", () => {
    const at = iso();
    const noLink = aToolCall({
      tier: "T4",
      compensation: "mettre la campagne en pause",
      approvedBy: OP,
      approvedAt: isoOffset(at, -60 * 1000),
      approvalId: null,
      at,
    });
    expect(codesOf(checkToolCall(noLink))).toContain("TOOLCALL_APPROVAL_LINK");
  });

  it("T4 approuvée AVANT l'exécution, liée à une Approval → succès", () => {
    const at = iso();
    const good = aToolCall({
      tier: "T4",
      compensation: "mettre la campagne en pause",
      approvedBy: OP,
      approvedAt: isoOffset(at, -60 * 1000), // approuvé 1 min avant
      approvalId: APPROVAL,
      at,
    });
    expect(checkToolCall(good).ok).toBe(true);
  });
});

describe("ToolCall ↔ Approval — invariant croisé (ajout)", () => {
  const at = iso();
  const decidedAt = isoOffset(at, -60 * 1000);
  const linkedCall = () =>
    aToolCall({ tier: "T4", compensation: "pause", approvedBy: OP, approvedAt: decidedAt, approvalId: APPROVAL, at });

  it("approbation accordée, cohérente, non expirée → succès", () => {
    const approval = anApproval({ id: APPROVAL, tier: "T4", decidedBy: OP, decidedAt, status: "granted" });
    expect(checkToolCallAgainstApproval(linkedCall(), approval).ok).toBe(true);
  });

  it("approbation refusée (denied) → échec", () => {
    const approval = anApproval({ id: APPROVAL, tier: "T4", decidedBy: OP, decidedAt, status: "denied" });
    expect(codesOf(checkToolCallAgainstApproval(linkedCall(), approval))).toContain("TOOLCALL_APPROVAL_STATUS");
  });

  it("tier divergent entre approbation et action → échec", () => {
    const approval = anApproval({ id: APPROVAL, tier: "T3", decidedBy: OP, decidedAt, status: "granted" });
    expect(codesOf(checkToolCallAgainstApproval(linkedCall(), approval))).toContain("TOOLCALL_APPROVAL_TIER");
  });

  it("approbation expirée avant l'exécution → échec", () => {
    const approval = anApproval({
      id: APPROVAL,
      tier: "T4",
      decidedBy: OP,
      decidedAt,
      status: "granted",
      expiresAt: isoOffset(at, -30 * 1000), // expirée 30 s AVANT l'exécution
    });
    expect(codesOf(checkToolCallAgainstApproval(linkedCall(), approval))).toContain("TOOLCALL_APPROVAL_EXPIRED");
  });

  it("id d'Approval qui ne correspond pas au tool-call → échec", () => {
    const approval = anApproval({ id: asId<ApprovalId>("approval-autre"), tier: "T4", decidedBy: OP, decidedAt });
    expect(codesOf(checkToolCallAgainstApproval(linkedCall(), approval))).toContain("TOOLCALL_APPROVAL_LINK");
  });
});

describe("AgentRun — humanMinutesSpent obligatoire", () => {
  it("un run terminé sans humanMinutesSource échoue", () => {
    const bad = aRun({ humanMinutesSource: undefined as unknown as "measured" });
    expect(codesOf(checkAgentRun(bad))).toContain("AGENTRUN_HUMAN_MINUTES_SOURCE");
  });

  it("un run terminé avec humanMinutesSpent négatif échoue", () => {
    expect(codesOf(checkAgentRun(aRun({ humanMinutesSpent: -1 })))).toContain("AGENTRUN_HUMAN_MINUTES");
  });

  it("un run terminé sans endedAt échoue", () => {
    expect(codesOf(checkAgentRun(aRun({ endedAt: null })))).toContain("AGENTRUN_ENDED_AT");
  });

  it("un run valide (mesuré, 0 minute) passe", () => {
    expect(checkAgentRun(aRun()).ok).toBe(true);
  });

  it("costTokens négatif → échec", () => {
    expect(codesOf(checkAgentRun(aRun({ costTokens: -5 })))).toContain("AGENTRUN_COST_TOKENS");
  });

  it("durationMs négatif → échec", () => {
    expect(codesOf(checkAgentRun(aRun({ durationMs: -1 })))).toContain("AGENTRUN_DURATION");
  });
});

describe("AgentRun — endedAt symétrique (point mineur 3)", () => {
  it("un run non terminé n'exige pas endedAt", () => {
    expect(checkAgentRun(aRun({ status: "started", endedAt: null })).ok).toBe(true);
  });

  it("un run non terminé qui porte déjà endedAt échoue", () => {
    expect(codesOf(checkAgentRun(aRun({ status: "started", endedAt: iso() })))).toContain(
      "AGENTRUN_ENDED_AT_PREMATURE",
    );
  });
});

describe("AgentRun — run système restreint à T0", () => {
  it("un run système (mandateId null) avec une action T4 échoue", () => {
    const at = iso();
    const run = aRun({
      mandateId: null,
      toolCalls: [
        aToolCall({ tier: "T4", compensation: "x", approvedBy: OP, approvedAt: isoOffset(at, -1000), approvalId: APPROVAL, at }),
      ],
    });
    expect(codesOf(checkAgentRun(run))).toContain("SYSTEM_RUN_TIER");
  });

  it("un run système avec uniquement des actions T0 passe", () => {
    const run = aRun({ mandateId: null, toolCalls: [aToolCall({ tier: "T0" })] });
    expect(checkAgentRun(run).ok).toBe(true);
  });
});
