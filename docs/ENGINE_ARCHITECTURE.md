# Engine architecture — `packages/engine`

Pure TypeScript, no database, no network, no LLM, no `Math.random`. One entry point, `runCycle(input)`, returns a `CycleResult` and emits `EngineEvent`s through an `EngineBus`.

## Modules

| Module | Responsibility | Deterministic? |
|---|---|---|
| `rng.ts` | Seeded PRNG (mulberry32) | yes |
| `property.ts` | `PropertySpec` → 41 `Observation`s with provenance + 156-week series for the property and 10 comparables; `checkConsistency` | yes |
| `benchmarks.ts` | Benchmark placeholders (status BENCHMARK) and methodology parameters | — |
| `diagnose.ts` | Constraints, dedup, potential / attainable / actual, limiting constraint | yes |
| `exposure.ts` | Forward exposures | yes |
| `interventions.ts` | Candidate interventions from constraints; calibration applied | yes |
| `voi.ts` | EVPI, EVSI, information decision; Assay verdict | yes |
| `allocate.ts` | Risk-adjusted allocation, blocking, reserve | yes |
| `decision.ts` | Decision record, "what would change this", governance level | yes |
| `register.ts` | Pre-registration: predictive interval (fixed seed), SHA-256, versioning | yes |
| `measure.ts` | NNLS, synthetic control, placebo test, status rules; simulated outcome (truth hidden) | yes |
| `learn.ts` | Learning records; calibration factors with shrinkage | yes |
| `bus.ts` | Event bus with real timestamps and engine state | timestamps are real |
| `cycle.ts` | The full loop; `compareRuns`; `deterministicView` | yes |

## Invariants enforced by tests (`src/__tests__`, 32 tests)

- Simulated data is internally consistent for 25 seeds; every observation has a source, a timestamp, a status, and evidence ids that resolve.
- actual ≤ attainable ≤ potential; deduplicated midpoint < naive total; the deduplication rule is printed.
- The binding constraint changes when the property changes; benchmark overrides change the diagnosis; unknown benchmark keys are rejected.
- Exposure probabilities are labelled MODELLED ASSUMPTION.
- EVPI ≥ 0 and 0 when no information could change the decision; COLLECT MORE INFORMATION only when EVSI > cost; DO NOT ACT when nothing helps.
- Paid acquisition is blocked while conversion binds, with reason and condition, and unblocks when conversion is at benchmark; nothing is funded and `NOTHING_FUNDED` is emitted when the budget is too small.
- The Assay is declined for a well-run property whose owner already has the right plan.
- Plans are hashed; any change is detected; a new version names the old one.
- NNLS weights are non-negative and sum to one; a zero effect is INCONCLUSIVE on ≥ 9 of 12 seeds and never VALIDATED; a +12 % effect is covered by the 90 % interval on ≥ 9 of 12 seeds.
- Calibration is claimed only when a factor changed; INCONCLUSIVE never calibrates; memory changes the next cycle and is shrunk.
- Same seed + inputs + memory → identical results apart from real event timestamps; a changed assumption shows in `compareRuns`.
- The event stream is ordered, real-time-stamped, passes through every engine state and ends IDLE.

## Application integration (`apps/web`)

- `lib/engine/store.ts` — process-memory system of record (runs, memory, live subscribers). `Persistence` interface is the seam for `@anesis/db` (PLANNED).
- `lib/engine/governance.ts` — every intent goes through `authorize()` from `@anesis/policy`. Read / simulate = T0; fund / execute = T3 (never executed by the app).
- `lib/engine/ask.ts` — question → intent → answer built only from run records; "Insufficient evidence" otherwise.
- `lib/engine/llm.ts` — optional rephrasing of facts; off without `ANTHROPIC_API_KEY`.
- Routes: `POST /api/engine/run` (SSE), `GET /api/engine/runs`, `GET /api/engine/runs/[id]?compare=`, `POST /api/engine/ask`, `POST /api/engine/reset`, `GET /api/engine/memory`, `GET /api/engine/stream` (SSE), `GET /api/engine/report/[id]`.
- Console: `/engine`. Studio hub `/team` now shows real engine events and answers through Ask Anesis; the previous timer-driven feed and templated chat were removed.

## Performance

A full cycle including 11 synthetic-control fits runs in roughly 0.4–0.8 s on the development machine. The console can show events as emitted or replay them at reading pace; replay is labelled and does not slow the engine.
