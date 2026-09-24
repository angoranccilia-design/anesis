# Governance — risk-based autonomy

## Levels

| Level | Name | Repository tier | What it means |
|---|---|---|---|
| L0 | OBSERVE | T0 | read, simulate, compare, scenario, ask |
| L1 | REVERSIBLE LOW-RISK ACTION | T1 | pause / resume / draft; executes with post-review |
| L2 | PREPARE / RECOMMEND | T2 | a recommendation or preparation, retained for review |
| L3 | HUMAN APPROVAL REQUIRED | T3 | any financial or contractual commitment |
| L4 | HUMAN DECISION ONLY | T5 | irreversible actions; commitments ≥ £50,000 |

Autonomous spend limit: **£0** (declared in `governance.ts`). The system commits no money on its own.

## How a sentence is handled (typed or spoken)

1. `classifyCommand(text)` parses any amount ("£20,000", "20k GBP", "20 000 £") and the verb class (commit / irreversible / reversible / prepare / simulate / read). A **question** that mentions money ("Where should we put the next £20,000?") is a question (L0). A **command** that commits money ("Launch the campaign with £20,000.") is L3; ≥ £50,000 or irreversible is L4.
2. The class is converted to a `ToolCallRecord` and passed to `@anesis/policy.authorize()`, which returns `allow`, `retain`, `require_approval` or `deny` (emergency stop first).
3. L3/L4 → the route answers **ACTION BLOCKED — risk classification T3 (level L3, HUMAN APPROVAL REQUIRED). Human approval required. Reason: financial commitment £20,000 exceeds the autonomous execution threshold.** Nothing runs. Voice uses the same route.

## Decision-level governance

`governanceLevel()` on each decision: nothing funded → L0; only information purchases recommended → L2; reversible actions ≤ £1,000 → L1; any funded spend → L3. Every intervention control record carries its own `approvalLevel` and `approvalTier`.

## Emergency stop

`ANESIS_EMERGENCY_STOP=1` denies every intent, including read-only ones.

## What the system never does

Execute an intervention; place spend; sign; send; publish. It recommends, blocks, registers, measures and remembers. Intervention is a consequence of the decision, not the product.

## Budgets

An intervention's estimated budget is a recommendation with status PROPOSED. It becomes APPROVED only by a recorded human decision at the required level, then AUTHORISED for execution; the engine cannot approve its own recommendation (`economics.ts`, `transitionBudget`). The partnership fee is a separate line and is never a pool the engine may spend from. See `COMMERCIAL_MODEL.md`.
