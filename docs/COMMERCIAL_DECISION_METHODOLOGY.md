# Commercial Decision Methodology

The methodology answers one question — *what should be done with the next pound, and how will we know it worked?* — in a fixed order. Each block is implemented in `packages/engine`.

| Block | Question | Foundation (documented, not claimed as invention) | Implementation | Status |
|---|---|---|---|---|
| 1. Constraint diagnosis | What limits the system now? | Limiting-factor principle (Liebig, 1840) applied to the new-guest chain demand → conversion → direct capture, plus a separate retention chain | `diagnose.ts`: attainment = observed ÷ benchmark per factor; lowest attainment binds; £ gaps per constraint with explicit deduplication | IMPLEMENTED |
| 2. Forward exposure | What is likely to hurt in the next 6–18 months? | Scenario exposure with declared probabilities | `exposure.ts`: probability labelled MODELLED ASSUMPTION; value at risk range with formula | IMPLEMENTED (probabilities UNVALIDATED) |
| 3. Value of information | Is it worth knowing more before acting? | Expected value of perfect / sample information (Raiffa & Schlaifer 1961; Howard 1966) | `voi.ts`: EVPI on "act or not"; EVSI = study quality × EVPI; PROCEED / COLLECT MORE INFORMATION / DO NOT ACT | IMPLEMENTED |
| 4. Decision and capital prioritisation | Which actions, in which order, with what reserve? | Risk-adjusted allocation inspired by decision theory and bet-sizing principles; reversibility and causal dependency as explicit multipliers | `allocate.ts`: score = (EV − λ·downside) × reversibility × dependency, ranked per £; reserve never allocated; ACTION BLOCKED with reason and required condition | IMPLEMENTED |
| 5. Pre-registration | What exactly will count as success? | Pre-registration practice (clinical trials 2000; psychology 2013) | `register.ts`: plan hashed (SHA-256) before any outcome; changes create a new version naming the old | IMPLEMENTED |
| 6. Causal measurement | Did it work, against what would have happened anyway? | Synthetic control with in-space placebo inference | `measure.ts`: NNLS weights on 104 pre-weeks, 10 comparables; placebo rank; ESTABLISHED / PROVISIONAL / INCONCLUSIVE | IMPLEMENTED, SIMULATED |
| 7. Learning | What should we believe differently next time? | Calibration with shrinkage; hierarchical pooling only after validation | `learn.ts`: factor = 1 + mean error × n/(n+3); claimed only when it changed; inconclusive results never calibrate | IMPLEMENTED |

## The eight questions the system answers before it recommends

For "What should I do with my next £16,000?" the engine first establishes: what it knows (observations with status), what it does not know (benchmarks are placeholders; confidences are declared), what limits the property (binding constraint), what information is worth buying (VOI per intervention), what the alternatives are (all candidates, with rejected ones and reasons), what the risk is (downside, reversibility, exposure), what to fund and what to block (allocation with conditions), and how it will be measured (registered plan). Only then does it answer — and it records what would change the answer.

## Deduplication rule (explicit)

Part of the bookings lost to poor mobile conversion are not lost stays but stays that move to an OTA. For that share (`substitution_to_ota`, a declared assumption), recovering the booking is worth only the commission — which is exactly what the direct-capture constraint already counts. The conversion constraint is therefore credited full value on (1 − s) and commission-only on s. The rule is printed with every diagnosis.

## Causal dependency rule (explicit)

Demand is only worth what conversion makes of it. An action on demand is blocked while conversion's attainment is more than ten points below demand's, and unblocks when the conversion metric reaches its benchmark or the conversion constraint is measured resolved. The rule is generic (`CONSUMED_BY` in `allocate.ts`); "block paid acquisition" is its output on this property, not a hard-coded conclusion. The test `unblocks paid acquisition once conversion is at benchmark` proves it.

## What the methodology is not

It is not a guarantee of results. It is a way of being wrong in a recorded, measurable, correctable manner: the system can be wrong without the methodology being broken.

## Additions in the final build

- **Five constraint kinds.** DEMAND, CONVERSION, CAPACITY, OPERATIONAL, ECONOMIC (plus RETENTION as a separate chain). The value chain is demand → conversion → capacity → operational; the lowest attainment binds. Capacity binds at peak occupancy ≥ 92 %, operations below 85 % staffing coverage (declared).
- **Statuses per intervention.** FUNDED · BLOCKED (an upstream/downstream dependency is unresolved) · INVESTIGATE (information is worth more than acting) · REJECTED · DEFERRED (budget). A dependency is moot when the constraint it addresses has no gap, or when memory shows it **measured resolved**.
- **External context.** Signals enter only through the relevance test (`EXTERNAL_INTELLIGENCE.md`); seasonality is profiled and never treated as causal; internal vs environmental change is tested against comparables.
- **Sensitivity.** Each input is perturbed ±20 % and the decision re-run: which assumption drives the value, and which flips the decision. Thresholds at which an intervention's status changes are found by bisection along an input; they become machine-readable conditions in "what would change this decision" and are cited by name when a scenario crosses one.
- **Value of information, made real.** The most decision-sensitive unknown is named with its VOI (HIGH if EVSI > 2 × cost) and a recommended next action.
- **Memory.** Every cycle is remembered (decisions, rejections with reasons, measurements, failed hypotheses, forecast errors). Recall answers "have we considered this?" with dates; measured-resolved constraints change the next cycle's dependencies; calibration changes its numbers. Portfolio pooling is implemented and off until validated.
- **Governance.** Levels L0–L4 with amount-aware classification of free text (`GOVERNANCE.md`).
