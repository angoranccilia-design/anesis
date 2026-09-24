# Product architecture — Anesis Commercial Intelligence System

*Status legend used across these documents: **IMPLEMENTED** (code exists, tests pass) · **SIMULATED** (works end-to-end on generated data, labelled as such) · **PLANNED** (designed, not built) · **UNVALIDATED** (built, not yet tested on a real property).*

## What it is

Anesis (the company) operates the Anesis Commercial Intelligence System (the product). Its intellectual core is the **Commercial Decision Methodology**: a repeatable loop that turns a hospitality property's data into a funded, measurable decision.

```
OBSERVE → DIAGNOSE → ANTICIPATE → VALUE OF INFORMATION → PRIORITISE → DECIDE → PRE-REGISTER → ACT / SIMULATE → MEASURE → LEARN
```

The service wrapper is: **Commercial Assay** (diagnosis, priced) → **Commercial Thesis** (funded plan with pre-registered measurement) → **Commercial Partnership** (execution under governance) → **Measurement & Learning** (settlement on measured effect).

## Layers

| Layer | Package / location | Status |
|---|---|---|
| Methodology engine (deterministic, no I/O) | `packages/engine` | IMPLEMENTED, SIMULATED data |
| Governance (autonomy tiers T0–T5, emergency stop) | `packages/policy` (existing) | IMPLEMENTED |
| System of record for runs and memory | `apps/web/lib/engine/store.ts` | IMPLEMENTED in process memory; DB persistence PLANNED |
| Interaction: console, evidence inspector, scenario lab, comparison, memory view, report | `apps/web/app/(founder)/engine`, `apps/web/components/engine` | IMPLEMENTED |
| Ask Anesis (structured answers, language detection, en/fr templates) | `apps/web/lib/engine/ask.ts` | IMPLEMENTED (other languages: detected, answered in English with a notice) |
| Language layer (LLM rephrasing of structured facts) | `apps/web/lib/engine/llm.ts` | IMPLEMENTED behind `ANTHROPIC_API_KEY`; OFF here |
| Voice (browser speech recognition and synthesis, interruption) | `components/engine/AskPanel.tsx` | IMPLEMENTED (browser-dependent); server realtime voice PLANNED |
| Public-signal collectors (page speed, reviews, HTML) | `packages/sources`, `packages/assessment` (existing) | IMPLEMENTED |
| Property connectors (PMS, analytics, CRM, ads) | — | PLANNED; simulation adapters labelled SIMULATED |
| Video analysis | — | PLANNED (contract only; UI states it is not enabled) |
| Portfolio memory, knowledge graph, data-rights fields | — | PLANNED |

## Why "engine first"

The product is not a dashboard: the console shows only what `runCycle` computed, with the record ids that produced it. There is no static content, no timer-driven state, no hard-coded conclusion. If the engine funds nothing, the console says so; if the measurement is inconclusive, the console says so.

## Runtime flow

1. A human (typed or spoken) or a button issues an intent. The intent is classified and authorised by `@anesis/policy` (`lib/engine/governance.ts`).
2. `executeRun` calls `runCycle` with a seed, a budget, optional property/benchmark overrides and the current memory.
3. The engine emits events with real timestamps through its bus; the route streams them (server-sent events) to the console, whose core changes state on each event.
4. The run is recorded; its learning record (if any) joins Anesis Memory and calibrates the next run.
5. Every number in the console resolves, on click, to its record: observation, constraint, exposure, intervention, decision, plan, learning record or source.
