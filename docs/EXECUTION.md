# Decision to execution

**STATUS: IMPLEMENTED and tested on synthetic fixtures** (`packages/execution`, Étape 3). Prepares interventions; executes nothing. No spend, no production change, no message sent, no campaign touched. Autonomous spend limit: £0.

## The intervention contract

`prepareInterventions(cycleResult, runId, preparedAt)` reads a real cycle and writes one contract per intervention record, with the founder's 24 fields: id, property, decision-package reference, targeted constraint (and whether it binds), the engine's diagnosis, the cited observations with their class (VERIFIED from a connector, ESTIMATED when modelled or benchmark, HYPOTHESIS when simulated), the four evidence lists (verified, estimated, hypotheses, unknown from the data-requirements check), the priority reason, the other options and why they were rejected, the invalidating conditions ("what would change the decision"), the objective, the baseline with its class, the result indicator and method, the observation window, risks, prerequisites, the estimated budget (ESTIMATE or UNKNOWN), the approved cost (UNKNOWN until a human approves), the owner Head with capabilities and resources, the concrete actions, the execution evidence required, the measurement protocol, confidence with its limits, and the history.

Every number comes from the engine's own records. Absent means null or UNKNOWN. The decision-time fields are hashed at preparation in canonical JSON (`originSha256`); the hash is re-checked on every load, so a stored contract whose origin drifted is refused.

## Deliverables

Derived from the contract and its nature, never imposed: a funded conversion intervention gets a technical ticket (with "Reproduction: NOT VERIFIED" until someone does it), a booking-journey brief and a measurement plan; a funded demand intervention gets an acquisition brief and a holdout test plan; retention gets a guest-sequence plan that sends nothing; anything measurable gets its measurement plan; an intervention the engine marked INVESTIGATE, or whose data requirements are unmet, gets a DATA_REQUEST (what is missing, why, which decision it would inform, what is impossible without it) and an analysis plan, and no brief at all. Every deliverable carries the note that it is prepared, not sent, and authorises no spend. A closure dossier lists the full history.

## Lifecycle

PREPARED → SUBMITTED → AUTHORISED → IN_EXECUTION → EXECUTED → MEASURED → CLOSED, with REJECTED and WITHDRAWN. It wraps the engine's budget lifecycle rather than duplicating it: AUTHORISED requires a named human and moves the budget PROPOSED → APPROVED → AUTHORISED with the approved amount; IN_EXECUTION requires an AUTHORISED budget with a known approved amount, whatever the funding model; EXECUTED requires execution evidence; MEASURED requires a measurement record. Unmet prerequisites and an open data request block authorisation. Every transition appends a history event; versions only go up; the origin never changes.

**The contract is the budget authority** (coherence audit, C3). Its `budgetStatus` and `approvedCost` are the engine's budget lifecycle as recorded; every transition checks them whether or not the caller hands over a budget record, and a record handed over must be the contract's own and agree with it. An UNKNOWN estimate cannot be authorised without a stated amount: UNKNOWN is never read as zero. A withdrawn or rejected proposal rejects its budget. `budgetFromContract` rebuilds the engine record from the contract; actual spend and provider cost are not kept on the contract and come back UNKNOWN.

## Outcome

`assessOutcome` keeps "observed change" apart from "incrementality": without a pre-registered plan the result is NOT_MEASURABLE; without a counterfactual run, with an altered plan, with an INCONCLUSIVE measurement or a failed placebo it is NOT_ESTABLISHED; ESTABLISHED only when the pre-registered comparison held and the placebo passed.

## Runtime

After each cycle the worker persists the contracts (`interventions` table, one row per run and intervention, no duplicates). `transitionIntervention` is the only write path afterwards; each transition is traced with who did it. Reloading a contract verifies its origin hash.

Continuity (C6): before a cycle the worker reads the open contracts. Committed ones (AUTHORISED, IN_EXECUTION, EXECUTED, MEASURED) go to the engine as `openInterventions`; the engine marks them IN_PROGRESS, charges nothing for them, registers no plan for them, and remembers their state (`memory.executions`, `cycle.inProgress`). Pending ones (PREPARED, SUBMITTED) are kept when the new decision is the same and withdrawn by the engine as "superseded" when it moved; no second proposal is written for the same intervention. The runtime runs the engine with `measure: false`: a measurement is a MEASURED transition on a contract with its record, never a simulated outcome.
