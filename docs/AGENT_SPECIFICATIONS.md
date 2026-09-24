# Agent specifications

"Agent" here means a computational responsibility with defined inputs, outputs and rules — not a marketing persona. Where the work is mathematics, the agent is deterministic code; a language model is used only to phrase, never to compute or invent a number.

| Agent | Input | Output | Rules | Code | Status |
|---|---|---|---|---|---|
| Signal | property spec / connectors | Observations with provenance; consistency report | every value has source, timestamp, status; identities must hold | `property.ts` | IMPLEMENTED (simulation adapter); live connectors PLANNED |
| Diagnostic | observations, benchmarks | constraints, dedup, limiting constraint | attainment per factor; lowest in chain binds; dedup rule printed | `diagnose.ts` | IMPLEMENTED |
| Exposure | observations, benchmarks | exposures | probabilities labelled MODELLED ASSUMPTION | `exposure.ts` | IMPLEMENTED |
| Decision | constraints, interventions, VOI, budget, memory | allocation, decision record | risk-adjusted score; causal blocking; reserve; what would change it | `voi.ts`, `allocate.ts`, `decision.ts` | IMPLEMENTED |
| Measurement | plan, series | measurement result | pre-registered plan verified by hash; synthetic control; placebo; INCONCLUSIVE allowed | `register.ts`, `measure.ts` | IMPLEMENTED, SIMULATED outcomes |
| Learning | plan, result, memory | learning record, calibration | claim calibration only when changed; inconclusive never calibrates; shrinkage | `learn.ts` | IMPLEMENTED |
| Governance | any intent | allow / retain / require_approval / deny | `@anesis/policy.authorize()`; emergency stop first; voice and text identical | `lib/engine/governance.ts` | IMPLEMENTED |
| Language | a structured answer | plain-English restatement | may not add numbers, causes or sources; shown beside the facts, never instead | `lib/engine/llm.ts` | IMPLEMENTED, OFF without key |

The existing 12-agent roster in `@anesis/core` (frozen) is an operating roster for a mandate; it is unchanged. The engine's agents above are analytical responsibilities the roster's `analyst` / `underwriter` would call.
