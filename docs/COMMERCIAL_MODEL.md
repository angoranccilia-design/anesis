# Commercial model — what the intelligence becomes as a service

Anesis sells a **continuous commercial responsibility**. The client pays Anesis to take charge of their commercial system: identify the constraints, decide the interventions, mobilise the capabilities, orchestrate execution, measure the result and learn from it. The word for that contract is **partnership**. The product represents three economic layers and keeps them apart by type (`packages/engine/src/economics.ts`).

## The three layers

| Layer | What it pays for | In the code |
|---|---|---|
| 1 · Partnership | Anesis's continuous responsibility: commercial intelligence, diagnosis, monitoring, forward exposure, prioritisation, Commercial Thesis, decision, governance, coordination and Heads, intervention management, measurement, experimentation governance, learning, Property Memory, decision reporting | `PartnershipTerms { monthlyFeeGbp, fundingModel, includedCapabilities, hybridIncludedLimitGbp }` — never a spending pool |
| 2 · Intervention budget | The economic budget an intervention needs. An **ESTIMATE** with assumptions, or **UNKNOWN**. A decision of its own with its own approval | `InterventionBudget { estimated, approved, actualSpend, providerCost, anesisRevenue, status, approvalLevel, fundingSource }` |
| 3 · Execution resources | The capabilities mobilised by the responsible Head: internal, contracted, partner, client team | `Capability`, `Provider`, `providerBriefs()` — orchestrated by Anesis; the client is not the project manager |

Money is never one number. `MoneyKind` separates observed cost, estimated intervention budget, approved budget, actual spend, provider cost, Anesis revenue, client-funded spend and media spend; each line is OBSERVED, ESTIMATE or UNKNOWN with its assumptions and source. The engine invents none of them: where no real figure exists the line is UNKNOWN.

## What the engine produces

A **decision package** per intervention (`DecisionPackage`), not a supplier invoice:

```
COMMERCIAL CONSTRAINT          Mobile booking conversion below benchmark
DECISION                       Prioritise: fix the mobile booking journey
ESTIMATED INTERVENTION BUDGET  £8,000 (ESTIMATE — declared engine estimate; not a quote, not the partnership fee, not authorised)
PARTNERSHIP                    Separate
FUNDING MODEL                  Requires contract determination   (or Model A/B/C/D → the derived funding source)
RESPONSIBLE ANESIS FUNCTION    Head of Digital Experience & Booking
REQUIRED CAPABILITIES          ux · cro · development · booking_engine
EXECUTION RESOURCES            ABC Digital (web_developer)      (known providers, may be empty)
CLIENT ROLE                    Approve intervention / constraints / budget; refuse; adjust; ask; provide resources; take the decisions that are theirs
ANESIS ROLE                    Own decision, orchestration, governance and measurement; the client is not the project manager
EXECUTION                      Mobilised by the responsible Head after approval
MEASUREMENT                    Anesis controlled measurement framework — pre-registered plan
OUTCOME                        Recorded against the plan
LEARNING                       Returned to Anesis Memory
BUDGET STATUS                  PROPOSED · approval REQUIRED (L3)
```

## The Heads (problem owners)

| Head | Owns interventions on | Typical capabilities mobilised |
|---|---|---|
| Strategy & Commercial Intelligence | coherence of diagnosis, methodology, arbitration between constraints, Commercial Thesis, complex decisions | — |
| Brand & Acquisition | demand, brand, positioning, Meta, Google, SEO, content, partnerships | paid media, content, brand |
| Digital Experience & Booking | website, UX, CRO, mobile, booking journey, booking engine, conversion | ux, cro, development, booking engine |
| Revenue & Conversion Economics | pricing, ADR, occupancy, yield, contribution margin, upsell, direct capture | revenue management, booking engine, cro |
| Guest Lifecycle & Experience | CRM, retention, repeat, guest journey, post-stay | crm, content, data |

The founder and CEO keeps overall direction, major strategic decisions, governance and company building.

## Funding models (flexible, never hard-coded)

A — managed partnership (some execution capabilities included) · B — partnership + intervention budget · C — hybrid (included up to a limit) · D — client-funded execution with Anesis responsible for orchestration and measurement. `fundingSource()` derives the funding source of an intervention from the model on record; with no contract on record it returns **requires contract determination**. Nothing assumes included or excluded.

## Governance of a budget

PROPOSED → APPROVED | REJECTED → AUTHORISED → IN_EXECUTION → CLOSED. Only a human moves a budget past PROPOSED (`transitionBudget` refuses otherwise); the approval level follows L0–L4 (`GOVERNANCE.md`). The engine's allocation event is **ACTION_PROPOSED**, never "funded"; the console labels it *Proposed · approval required*.

## The order that never changes

Business problem → data → diagnosis → limiting constraint → decision → intervention → required capabilities → execution → measurement → learning. The intervention is a consequence of the diagnosis; it is not the product sold first. Anesis is not an agency à la carte.

## What remains simulated or not connected

Partnership terms and providers are operator-entered registers (no contract system is connected). Estimated intervention budgets are declared engine estimates for the five candidate interventions. Provider costs, approved budgets, actual spend and Anesis revenue are UNKNOWN until a human records them.
