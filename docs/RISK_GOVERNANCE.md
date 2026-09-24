# Risk and governance

## Autonomy levels (brief §28) and repository tiers

| Level | Meaning | Tier in `@anesis/policy` | Engine usage |
|---|---|---|---|
| 0 | observe only | T0 | run, compare, reset, ask, scenario |
| 1 | recommend; human executes | T0 (recommendation is internal) | a decision with spend or non-High reversibility |
| 2 | execute reversible, low-cost actions with human review | T1/T2 | all funded actions reversible and ≤ £5,000 |
| 3 | execute within bounds | T3 | not used by this application |
| 4 | execute, escalate on anomaly | T4 | not used by this application |

`governanceLevel()` in `decision.ts` computes the level from the funded interventions; the application never executes anything — it records and recommends. A typed or spoken "fund X" is classified `fund`, mapped to T3, and `authorize()` returns `require_approval`; the console shows "not executed".

## Emergency stop

`ANESIS_EMERGENCY_STOP=1` makes every intent — including read-only ones — return `deny` from `authorize()`; the routes answer 403. Mandate-level stop is wired in the existing runtime and not used by the console.

## Financial risk controls in the methodology

- Reserve (10 %) never allocated.
- Downside penalty λ = 0.5 on cost-at-risk; reversibility multipliers 1.0 / 0.8 / 0.6.
- Causal blocking: no spend on a factor whose output the binding constraint would waste.
- Value of information: no commitment when a cheaper study resolves the doubt.
- Pre-registration: the success rule cannot be moved after the fact.
- Assay verdict: the engine declines the engagement when the diagnosis is not worth ≥ 3× its price over what the owner would do anyway.

## Data and privacy

Tenant isolation exists in the database layer (RLS by mandate). Data-rights fields (owner, licence, retention, consent to pooling) are PLANNED. No inter-property data pool is built or assumed; the March 2026 CMA inquiry into hotel data sharing is a reason to keep it that way until a legal opinion exists.

## Honest failure states

- Inconsistent simulated data → `DATA_INCONSISTENT` event, state ALERT.
- Nothing fundable → `NOTHING_FUNDED`, level 0, no plan, no measurement.
- INCONCLUSIVE measurement → state ALERT, no calibration, plan NOT_VALIDATED.
- Unanswerable question → "Insufficient evidence".
- No LLM key → "LLM interpretation not enabled".
- No speech API → "Voice is not available in this browser".
- No video model → "Video analysis is not enabled in this environment".
