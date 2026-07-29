/**
 * Vues (view-models) du read-model. Montants en pence (£ formaté par l'UI). Ces types sont partagés
 * par les requêtes DB (cockpit/dashboard) ET par les fixtures de démo du site — même forme partout.
 */
export type MandateStateView = "active" | "suspended" | "completed" | "terminated";
export type ApprovalTierView = "T0" | "T1" | "T2" | "T3" | "T4" | "T5";
export type ApprovalStatusView = "pending" | "granted" | "denied" | "expired";

/** Une ligne du pipeline cockpit : un mandat, vu de haut. */
export interface CockpitMandateRow {
  readonly mandateId: string;
  readonly propertyName: string;
  readonly region: string;
  readonly state: MandateStateView;
  readonly leakIndex: number | null;
  readonly formula: "growth" | "domination" | null;
  readonly termMonths: number | null;
  readonly incentiveRate: number | null;
  readonly objectivesCount: number;
  readonly tasksCount: number;
  readonly pendingApprovals: number;
  readonly humanMinutes: number;
}

/** Une approbation transversale : qui a décidé (le cas échéant) est visible pour la fondatrice. */
export interface CockpitApprovalRow {
  readonly approvalId: string;
  readonly mandateId: string;
  readonly propertyName: string;
  readonly toolCallName: string;
  readonly tier: ApprovalTierView;
  readonly status: ApprovalStatusView;
  readonly decidedBy: string | null;
  readonly requestedAt: string;
  readonly amountPence: number | null;
}

export interface CockpitTotals {
  readonly mandates: number;
  readonly pendingApprovals: number;
  readonly humanMinutes: number;
  readonly monthlyRecurringPence: number; // somme des abonnements mensuels (termes proposés)
}

export interface CockpitOverview {
  readonly mandates: readonly CockpitMandateRow[];
  readonly pendingApprovals: readonly CockpitApprovalRow[];
  readonly totals: CockpitTotals;
}

/** Dashboard d'un établissement (mandat unique). */
export interface DashboardLossLine {
  readonly pillar: string;
  readonly annualLossPence: number;
  readonly rootCause: string;
}
export interface DashboardObjective {
  readonly id: string;
  readonly title: string;
  readonly targetRecoveryPence: number;
}
export interface DashboardAgentTasks {
  readonly agent: string;
  readonly count: number;
}
export interface DashboardCommercialTerms {
  readonly formula: "growth" | "domination";
  readonly termMonths: number;
  readonly incentiveRate: number;
  readonly monthlySubscriptionPence: number;
  readonly photoSessions: number;
}
export interface ClientDashboard {
  readonly mandateId: string;
  readonly propertyName: string;
  readonly region: string;
  readonly state: MandateStateView;
  readonly leakIndex: number | null;
  readonly commercialTerms: DashboardCommercialTerms | null;
  readonly recoverableAnnualPence: number; // somme des pertes annuelles chiffrées
  readonly lossLines: readonly DashboardLossLine[];
  readonly objectives: readonly DashboardObjective[];
  readonly tasksByAgent: readonly DashboardAgentTasks[];
}
