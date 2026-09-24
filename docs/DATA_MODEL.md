# Data model — system of record (`packages/engine/src/model.ts`)

Every record shown to a human carries provenance. Status vocabulary: **VERIFIED** (read from a system of record — none exist in this environment), **SIMULATED**, **MODELLED** (computed by a declared formula), **BENCHMARK** (placeholder reference), **EXPERIMENTAL**.

| Record | Key fields | Produced by |
|---|---|---|
| `Source` | id, name, kind (simulation / system / benchmark / derived), note | `property.ts` (`SOURCES`) |
| `Observation` | id, metric, value, unit, period, source, timestamp, transformation, assumptions, confidence, status, evidence[] | `simulateProperty` (41 per property) |
| `Constraint` | id, factor, metric, observed, benchmark, attainment, gapGbp {low, high}, confidence, status, formula, assumptions, evidence[], dependsOn[] | `diagnose` |
| `Diagnosis` | potential / attainable / actual, constraints, totalAddressableGbp, deduplicatedGbp, dedupMethod, binding, bindingWhy, evidence[], computedAt | `diagnose` |
| `Exposure` | id, name, horizonMonths, probability, probabilityBasis, valueAtRiskGbp, drivers, mitigation, uncertainty, formula, status, evidence[] | `anticipate` |
| `Intervention` | id, name, actsOn, addresses[], costGbp, effectIfWorksGbp, confidence, confidenceBasis, risk, reversibility, timeToImpactWeeks, mustFollow[], informationOption, calibration, evidence[] | `interventions` |
| `VoiResult` | interventionId, expectedValueGbp, evpiGbp, evsiGbp, informationCostGbp, decision, reason | `valueOfInformation` |
| `AssayVerdict` | ownerPlanValueGbp, informedPlanValueGbp, valueOfDiagnosisGbp, thesisPriceGbp, ratio, verdict, reason | `assayVerdict` |
| `Allocation` / `AllocationLine` | budget, reserve, lines {allocated, riskAdjustedValue, expectedValue, funded, blockedBy[], requiredCondition}, formula | `allocate` |
| `Decision` | id, timestamp, question, alternatives, selected, rejected {id, reasons}, constraints, evidence, assumptions, expectedValueGbp, confidence, confidenceBasis, wouldChangeIf[], governance {level, reason} | `buildDecision` |
| `MeasurementPlan` | id, version, supersedes, registeredAt, interventionIds, hypotheses, primaryMetric, secondaryMetrics, baseline, expectedGbp, expectedPointGbp, windowWeeks, counterfactualMethod, successRule, stoppingRule, sha256 | `preregister` |
| `MeasurementResult` | planId, planIntact, method, methodWhy, observed, counterfactual, incrementalGbp (90 %), point, effectPct, sePct, pPositive, placebo {passed, rank, of, note}, preFitRmspe, status, planStatus, measuredAt | `measure` |
| `LearningRecord` | id, timestamp, propertyId, interventionTypes, context, expectedGbp, observedGbp, error, measurementStatus, calibrationApplied, calibrationNote | `learningRecord` |
| `EngineEvent` | seq, at (real), type, state, detail, refs[] | `EngineBus` |

Records not yet modelled (PLANNED): `Property` as a persisted entity with data-rights fields (owner, licence, retention, sharing consent), `Hypothesis` as a first-class record (currently strings in the plan), `AgentRun` linkage to `@anesis/core`'s `AgentRun`, portfolio-level memory.

## Provenance chain example

`C-001` (conversion constraint) cites `OBS-015` (sessions.mobile, MODELLED = OBS-013 × OBS-014), `OBS-017` (conv.mobile, SIMULATED from SRC-SIM-WEB), `OBS-016`, `OBS-014`, `OBS-028` (booking_value_avg = OBS-003 adr × 1.9). Its benchmark comes from `SRC-BENCH` and is a placeholder. The console's evidence inspector walks this chain by clicking.
