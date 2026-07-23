/** @anesis/planning — dérivation PURE thèse → objectifs → tâches (déterministe, sans DB, sans LLM). */
export {
  DEFAULT_PLANNING_CONFIG,
  PILLARS,
  type Pillar,
  type PillarPolicy,
  type PlanningConfig,
} from "./config.js";
export {
  deriveThesis,
  derivePlan,
  derivePlanFromAssessment,
  type DerivedPlan,
  type PlanningDeps,
} from "./plan.js";
