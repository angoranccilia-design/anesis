/**
 * Source de données de l'interface interne (cockpit fondatrice + dashboard client).
 *
 * ÉTAT ACTUEL : rend des FIXTURES de démonstration (établissements FICTIFS, mêmes chiffres que le seed
 * de `@anesis/readmodel`) pour que les pages soient développables et visibles SANS base réelle. Aucune
 * donnée réelle, aucun mandat payant exécuté (contrainte de résidence : conditionnel avant le visa).
 *
 * BASCULE AUTOMATIQUE : si `DATABASE_URL` est fourni, `getCockpitOverview` / `getClientDashboard`
 * interrogent `@anesis/readmodel` (`cockpitOverview` via withFounder, `clientDashboard` via withMandate) ;
 * sinon ils rendent les fixtures de démo ci-dessous. Les TYPES sont identiques à ceux du read-model.
 * Montants en pence, £ formaté par l'UI, en-GB.
 */
import "server-only";
import { isDbConfigured, withDbClient } from "./db";
export type MandateStateView = "active" | "suspended" | "completed" | "terminated";
export type ApprovalTierView = "T0" | "T1" | "T2" | "T3" | "T4" | "T5";

export interface CockpitMandateRow {
  mandateId: string;
  propertyName: string;
  region: string;
  state: MandateStateView;
  leakIndex: number | null;
  formula: "growth" | "domination" | null;
  termMonths: number | null;
  incentiveRate: number | null;
  objectivesCount: number;
  tasksCount: number;
  pendingApprovals: number;
  humanMinutes: number;
}
export interface CockpitApprovalRow {
  approvalId: string;
  mandateId: string;
  propertyName: string;
  toolCallName: string;
  tier: ApprovalTierView;
  decidedBy: string | null;
  amountPence: number | null;
}
export interface CockpitOverview {
  mandates: CockpitMandateRow[];
  pendingApprovals: CockpitApprovalRow[];
  totals: { mandates: number; pendingApprovals: number; humanMinutes: number; monthlyRecurringPence: number };
  demo: boolean;
}

export interface DashboardLossLine {
  pillar: string;
  annualLossPence: number;
  rootCause: string;
}
export interface DashboardCommercialTerms {
  formula: "growth" | "domination";
  termMonths: number;
  incentiveRate: number;
  monthlySubscriptionPence: number;
  photoSessions: number;
}
export interface ClientDashboard {
  mandateId: string;
  propertyName: string;
  region: string;
  state: MandateStateView;
  leakIndex: number | null;
  commercialTerms: DashboardCommercialTerms | null;
  recoverableAnnualPence: number;
  lossLines: DashboardLossLine[];
  objectives: { id: string; title: string; targetRecoveryPence: number }[];
  tasksByAgent: { agent: string; count: number }[];
  demo: boolean;
}

// ── Fixtures (miroir du seed @anesis/readmodel) ─────────────────────────────────────────────────
const COTSWOLD_LOSSES: DashboardLossLine[] = [
  { pillar: "ota_parity", annualLossPence: 4_200_000, rootCause: "Direct rate undercut by OTA on peak weekends" },
  { pillar: "response_time", annualLossPence: 1_900_000, rootCause: "Enquiries answered in hours, not minutes" },
  { pillar: "review_velocity", annualLossPence: 1_100_000, rootCause: "Reviews left unanswered beyond the useful window" },
  { pillar: "retargeting", annualLossPence: 900_000, rootCause: "No retargeting on abandoned booking journeys" },
];
const HARBOUR_LOSSES: DashboardLossLine[] = [
  { pillar: "response_time", annualLossPence: 1_500_000, rootCause: "Slow website and slow replies" },
  { pillar: "social_presence", annualLossPence: 1_200_000, rootCause: "Thin, inconsistent social presence" },
  { pillar: "review_velocity", annualLossPence: 700_000, rootCause: "Good reviews, rarely acknowledged" },
];
const ARDS_LOSSES: DashboardLossLine[] = [
  { pillar: "ota_parity", annualLossPence: 1_300_000, rootCause: "Heavy OTA reliance on shoulder nights" },
  { pillar: "retargeting", annualLossPence: 600_000, rootCause: "No paid recapture of warm demand" },
];

const MANDATES: CockpitMandateRow[] = [
  { mandateId: "m-ards", propertyName: "Ards Priory", region: "South West", state: "active", leakIndex: 58, formula: null, termMonths: null, incentiveRate: null, objectivesCount: 2, tasksCount: 1, pendingApprovals: 0, humanMinutes: 4 },
  { mandateId: "m-harbour", propertyName: "Harbour House", region: "Cornwall", state: "active", leakIndex: 64, formula: "growth", termMonths: 6, incentiveRate: 0.15, objectivesCount: 3, tasksCount: 3, pendingApprovals: 0, humanMinutes: 17 },
  { mandateId: "m-cotswold", propertyName: "The Cotswold Mill", region: "Cotswolds", state: "active", leakIndex: 71, formula: "domination", termMonths: 12, incentiveRate: 0.1, objectivesCount: 4, tasksCount: 4, pendingApprovals: 1, humanMinutes: 45 },
];

const sum = (ls: DashboardLossLine[]) => ls.reduce((s, l) => s + l.annualLossPence, 0);

const DASHBOARDS: Record<string, ClientDashboard> = {
  "m-cotswold": {
    mandateId: "m-cotswold", propertyName: "The Cotswold Mill", region: "Cotswolds", state: "active", leakIndex: 71,
    commercialTerms: { formula: "domination", termMonths: 12, incentiveRate: 0.1, monthlySubscriptionPence: 440_000, photoSessions: 4 },
    recoverableAnnualPence: sum(COTSWOLD_LOSSES), lossLines: COTSWOLD_LOSSES,
    objectives: COTSWOLD_LOSSES.map((l, i) => ({ id: `obj-cotswold-${i}`, title: `Recover: ${l.rootCause}`, targetRecoveryPence: Math.round(l.annualLossPence * 0.6) })),
    tasksByAgent: [{ agent: "conversion", count: 1 }, { agent: "media-buyer", count: 1 }, { agent: "rate-distribution", count: 1 }, { agent: "reputation", count: 1 }],
    demo: true,
  },
  "m-harbour": {
    mandateId: "m-harbour", propertyName: "Harbour House", region: "Cornwall", state: "active", leakIndex: 64,
    commercialTerms: { formula: "growth", termMonths: 6, incentiveRate: 0.15, monthlySubscriptionPence: 340_000, photoSessions: 2 },
    recoverableAnnualPence: sum(HARBOUR_LOSSES), lossLines: HARBOUR_LOSSES,
    objectives: HARBOUR_LOSSES.map((l, i) => ({ id: `obj-harbour-${i}`, title: `Recover: ${l.rootCause}`, targetRecoveryPence: Math.round(l.annualLossPence * 0.6) })),
    tasksByAgent: [{ agent: "content-creator", count: 1 }, { agent: "conversion", count: 1 }, { agent: "reputation", count: 1 }],
    demo: true,
  },
  "m-ards": {
    mandateId: "m-ards", propertyName: "Ards Priory", region: "South West", state: "active", leakIndex: 58,
    commercialTerms: null, recoverableAnnualPence: sum(ARDS_LOSSES), lossLines: ARDS_LOSSES,
    objectives: ARDS_LOSSES.map((l, i) => ({ id: `obj-ards-${i}`, title: `Recover: ${l.rootCause}`, targetRecoveryPence: Math.round(l.annualLossPence * 0.6) })),
    tasksByAgent: [{ agent: "rate-distribution", count: 1 }],
    demo: true,
  },
};

export async function getCockpitOverview(): Promise<CockpitOverview> {
  if (isDbConfigured()) {
    const real = await withDbClient(async (c) => {
      const { cockpitOverview } = await import("@anesis/readmodel");
      return cockpitOverview(c);
    });
    if (real) {
      return {
        mandates: real.mandates.map((m) => ({ ...m })),
        pendingApprovals: real.pendingApprovals.map((a) => ({
          approvalId: a.approvalId,
          mandateId: a.mandateId,
          propertyName: a.propertyName,
          toolCallName: a.toolCallName,
          tier: a.tier,
          decidedBy: a.decidedBy,
          amountPence: a.amountPence,
        })),
        totals: { ...real.totals },
        demo: false,
      };
    }
  }
  const active = MANDATES.filter((m) => m.state === "active");
  return {
    mandates: MANDATES,
    pendingApprovals: [
      { approvalId: "appr-m-cotswold", mandateId: "m-cotswold", propertyName: "The Cotswold Mill", toolCallName: "launch_campaign", tier: "T4", decidedBy: null, amountPence: 48_000 },
    ],
    totals: {
      mandates: MANDATES.length,
      pendingApprovals: MANDATES.reduce((s, m) => s + m.pendingApprovals, 0),
      humanMinutes: MANDATES.reduce((s, m) => s + m.humanMinutes, 0),
      monthlyRecurringPence: active.reduce((s, m) => s + (m.formula === "domination" ? 440_000 : m.formula === "growth" ? 340_000 : 0), 0),
    },
    demo: true,
  };
}

export async function getClientDashboard(mandateId: string): Promise<ClientDashboard | null> {
  if (isDbConfigured()) {
    const real = await withDbClient(async (c) => {
      const { clientDashboard } = await import("@anesis/readmodel");
      return clientDashboard(c, mandateId);
    });
    return real
      ? {
          ...real,
          commercialTerms: real.commercialTerms ? { ...real.commercialTerms } : null,
          lossLines: [...real.lossLines],
          objectives: [...real.objectives],
          tasksByAgent: [...real.tasksByAgent],
          demo: false,
        }
      : null;
  }
  return DASHBOARDS[mandateId] ?? null;
}

export const listDemoMandates = (): CockpitMandateRow[] => MANDATES;
