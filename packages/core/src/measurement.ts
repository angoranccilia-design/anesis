/**
 * Measurement — relevé périodique réel vs prévu. Le « prévu » vient de la thèse (étape 2).
 */
import type { Iso8601, MandateId, MeasurementId, ObjectiveId } from "./primitives.js";

export interface Measurement {
  readonly id: MeasurementId;
  readonly mandateId: MandateId;
  readonly objectiveId: ObjectiveId | null;
  readonly metric: string;
  readonly period: string; // ex: "2026-08"
  readonly planned: number;
  readonly actual: number;
  readonly deviationPct: number;
  readonly recordedAt: Iso8601;
}
