import { describe, expect, it } from "vitest";
import { authorize } from "../policy.js";
import { RETENTION_WINDOW_MS, iso, isoOffset } from "@anesis/core";
import type {
  AgentRunId,
  Approval,
  ApprovalId,
  AutonomyTier,
  Iso8601,
  MandateId,
  OperatorId,
  ToolCallRecord,
} from "@anesis/core";
import { asId } from "@anesis/core/unsafe";

const OP = asId<OperatorId>("op-cecilia");
const APPR = asId<ApprovalId>("appr-1");

const intent = (tier: AutonomyTier, over: Partial<ToolCallRecord> = {}): ToolCallRecord => ({
  name: "act",
  tier,
  input: {},
  output: {},
  at: iso(),
  approvalId: null,
  approvedBy: null,
  approvedAt: null,
  retentionStartedAt: null,
  reversible: false,
  compensation: null,
  ...over,
});

const grantedApproval = (tier: AutonomyTier, decidedAt: Iso8601, over: Partial<Approval> = {}): Approval => ({
  id: APPR,
  mandateId: asId<MandateId>("m"),
  runId: asId<AgentRunId>("r"),
  toolCallName: "act",
  tier,
  reason: "budget",
  payload: {},
  amount: null,
  status: "granted",
  requestedAt: decidedAt,
  expiresAt: null,
  decidedBy: OP,
  decidedAt,
  ...over,
});

const base = { globalStop: false, mandateStopped: false };

describe("authorize — régimes T0..T5 (délègue les invariants à core)", () => {
  it("T0 et T1 → allow immédiat", () => {
    expect(authorize(intent("T0"), base).kind).toBe("allow");
    expect(authorize(intent("T1"), base).kind).toBe("allow");
  });

  it("T2 → retain (fenêtre 2 h), puis allow une fois la fenêtre écoulée", () => {
    expect(authorize(intent("T2", { compensation: "x" }), base)).toEqual({
      kind: "retain",
      windowMs: RETENTION_WINDOW_MS,
    });
    expect(authorize(intent("T2", { compensation: "x" }), { ...base, retentionElapsed: true }).kind).toBe("allow");
  });

  it("T3/T4/T5 sans Approval reliée → require_approval", () => {
    expect(authorize(intent("T4"), base).kind).toBe("require_approval");
    expect(authorize(intent("T5"), base).kind).toBe("require_approval");
  });

  it("T4 avec Approval granted, cohérente, non expirée → allow", () => {
    const at = iso();
    const decidedAt = isoOffset(at, -60_000);
    const tc = intent("T4", { at, approvalId: APPR, approvedBy: OP, approvedAt: decidedAt, compensation: "pause" });
    expect(authorize(tc, { ...base, approval: grantedApproval("T4", decidedAt) }).kind).toBe("allow");
  });

  it("T4 avec Approval denied → deny (code venant de core)", () => {
    const at = iso();
    const decidedAt = isoOffset(at, -60_000);
    const tc = intent("T4", { at, approvalId: APPR, approvedBy: OP, approvedAt: decidedAt, compensation: "pause" });
    const r = authorize(tc, { ...base, approval: grantedApproval("T4", decidedAt, { status: "denied" }) });
    expect(r.kind).toBe("deny");
    if (r.kind === "deny") expect(r.code).toBe("TOOLCALL_APPROVAL_STATUS");
  });

  it("T4 avec Approval expirée avant l'exécution → deny EXPIRED", () => {
    const at = iso();
    const decidedAt = isoOffset(at, -120_000);
    const tc = intent("T4", { at, approvalId: APPR, approvedBy: OP, approvedAt: decidedAt, compensation: "pause" });
    const appr = grantedApproval("T4", decidedAt, { expiresAt: isoOffset(at, -1_000) });
    const r = authorize(tc, { ...base, approval: appr });
    expect(r.kind).toBe("deny");
    if (r.kind === "deny") expect(r.code).toBe("TOOLCALL_APPROVAL_EXPIRED");
  });
});

describe("arrêt d'urgence — priorité absolue (exigence 3)", () => {
  it("T4 avec Approval VALIDE mais mandat en arrêt d'urgence → deny EMERGENCY_STOP", () => {
    const at = iso();
    const decidedAt = isoOffset(at, -60_000);
    const tc = intent("T4", { at, approvalId: APPR, approvedBy: OP, approvedAt: decidedAt, compensation: "pause" });
    const r = authorize(tc, { globalStop: false, mandateStopped: true, approval: grantedApproval("T4", decidedAt) });
    expect(r.kind).toBe("deny");
    if (r.kind === "deny") expect(r.code).toBe("EMERGENCY_STOP");
  });

  it("arrêt global → deny EMERGENCY_STOP, même pour une action T0", () => {
    expect(authorize(intent("T0"), { globalStop: true, mandateStopped: false })).toMatchObject({
      kind: "deny",
      code: "EMERGENCY_STOP",
    });
  });
});
