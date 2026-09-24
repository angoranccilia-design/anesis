# Provider governance

Anesis does not replace the property's agencies, developers, revenue managers or CRM providers. It owns the commercial decision and the measurement above them. `packages/engine/src/providers.ts`.

**Model.** `Provider { id, name, role (meta_agency | search_agency | seo_agency | web_developer | revenue_manager | crm_agency | internal_team | founder), scope, factors[], systems[] }`. Each intervention control record (`InterventionRecord`) already carries owner, dependency, dependency status, capital, expected impact, risk, reversibility, confidence, measurement plan, success threshold, decision status, approval level, dates, outcome, forecast error and learning. `providerBriefs()` assigns a provider to each intervention (explicit factor mapping first, then role defaults) and produces:

```
ANESIS DECISION
Problem:            Mobile booking conversion below benchmark (C-001)
Intervention:       I-001 Fix the mobile booking journey
Execution:          ABC Digital (web_developer)          Commercial owner: ANESIS
Instruction:        PROCEED
Success threshold:  mobile booking conversion ≥ 1.21 % (the level at which the dependent acquisition decision changes) — and the pre-registered plan's rule
Measurement:        pre-registered plan MP-001: synthetic-control counterfactual, placebo-tested; the provider's own attribution is not the measure
Deadline:           start + time to impact + measurement window
Acquisition status: BLOCKED until the threshold is evaluated (Northern Social: DO NOT START I-004)
```

Instructions are PROCEED (funded), PREPARE (investigate first: the information purchase), HOLD (deferred by budget), DO_NOT_START (blocked or rejected, with the reason).

**Evidence history, never a ranking.** `providerReliability()` reports, per provider: interventions executed, measured, mean absolute forecast error, share established. It is built from the property memory's measured interventions and stated as evidence.

**Status.** IMPLEMENTED and tested on the stress-test property (external developer receives the conversion brief with the unblocking threshold; the Meta agency receives DO NOT START).
