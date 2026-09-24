# Implementation audit — before building the Commercial Intelligence Engine

*24 September 2026. Written before any engine code, as required by the Master Build Brief §42. Every claim below was checked against the repository at commit `6139fea`, with dependencies installed and the full test suite run (58 test files, all green).*

## 1. What exists

**Monorepo** (pnpm 9, Node ≥ 20, TypeScript 5.7, ESM, vitest). Ten packages and two apps, ~15,500 lines of TS/TSX, CI on GitHub Actions (unit with PGlite, plus a real Postgres + PgBouncer job).

| Package | Status | What it genuinely does | Relevance to the engine |
|---|---|---|---|
| `@anesis/core` | **IMPLEMENTED** | Domain types, `Money` in pence, state machines, invariants, autonomy tiers T0–T5, `ROSTER` of 12 agents, thesis/objective/task/measurement types | Reuse `Money`, ids, `AutonomyTier`, measurement types |
| `@anesis/db` | **IMPLEMENTED** | Drizzle + 14 SQL migrations; RLS by mandate; **append-only `events` table** (id, type, payload, mandate_id, emitted_by, emitted_at, correlation_id); tables for measurements, approvals, tool_calls, artifacts, assessments | Persistence target for decision logs, registrations and learning records; the `events` table is the audit trail |
| `@anesis/events` | **IMPLEMENTED** | Event bus over the events table; typed subscriptions; idempotent replay | **The engine must emit through this** so the UI event stream is real |
| `@anesis/policy` | **IMPLEMENTED** | `authorize()` T0–T5: allow / retain (2 h window) / require_approval / deny; emergency stop first | **Governance agent = this.** Do not re-implement |
| `@anesis/assessment` | **IMPLEMENTED, PARTIAL** | Gate-1 scoring on public signals: 5 pillars (speed, reviews, OTA, retargeting, social) → leak index, monthly loss, decision code. Pure and deterministic; LLM strictly confined to `report.ts`, which may only describe frozen numbers | Becomes the **public-signal observation source**. It is *not* the diagnosis engine the brief asks for: no yield-gap, no dedup across pillars, no constraint logic |
| `@anesis/planning` | **IMPLEMENTED** | Pure derivation thesis → objectives → tasks, money allocation without rounding drift | Reusable for turning a decision into tasks |
| `@anesis/readmodel` | **IMPLEMENTED** | Cockpit and dashboard views, demo seed | UI reads |
| `@anesis/agent-runtime` | **IMPLEMENTED** | Runtime with `startRun/emit/completeRun`, 12 agents reacting to events under policy; retention scheduler; approval decisions | Agents exist but **most have no analytical responsibility**: they route tasks and produce artefacts. The brief's Diagnostic / Exposure / Decision / Measurement / Learning agents do not exist |
| `@anesis/sources` | **IMPLEMENTED (adapters)** | PageSpeed, Apify reviews, HTML signals behind `RawObservations` | Real connectors for public data; no PMS/GA4/ads connectors |
| `@anesis/auth` | **IMPLEMENTED** | Magic-link auth, Resend adapter (no-op without key) | — |
| `apps/web` | **IMPLEMENTED (site), MOCKED (studio)** | Next 15, React 19, Tailwind, framer-motion, recharts. Public site, cockpit, dashboard, thesis documents | See §2 |
| `apps/campaign` | **IMPLEMENTED** | CLI campaign runner | — |

**Brand tokens already defined** (`tailwind.config.ts`): forest greens (#0E1F16 → #356E50), cream (#FBF8F1 → #E4D8C2), gold (#CBAE79 / #B08D4C / #8F6F38); Cormorant Garamond, Inter, Pinyon Script. The "deep dark environment" the brief asks for maps to `forest-950/900`; gold accents exist. No new palette needed.

## 2. What is currently mocked or static (must not survive)

| Location | What is fake | Rule violated |
|---|---|---|
| `apps/web/components/studio/TeamHub.tsx:37` | `setInterval` pushes pre-written activity items every 4.5 s as a "live" feed | §0 (fake live stream), §20 |
| `apps/web/components/studio/TeamHub.tsx:216` | Chat drawer answers with `setTimeout(900)` and a templated sentence | §0 (fake AI thinking), §21 |
| `apps/web/lib/agents.ts` | `SAMPLE_ACTIVITY`, `AUDIT_SAMPLE`: hard-coded events shown as activity | §20 |
| `apps/web/app/team/page.tsx` | Public "Anesis Office" preview built on the above | — |
| `packages/assessment` decision codes | Scoring weights are declared assumptions, not sourced benchmarks | Acceptable if labelled MODELLED ASSUMPTION |

Everything else in the repo is either real computation or an honest adapter with a no-op fallback.

## 3. What does not exist yet (the engine)

| Capability (brief §) | Status |
|---|---|
| Structured system of record: Observation, Metric with provenance, Constraint, Exposure, Hypothesis, Intervention, Decision, MeasurementPlan, MeasurementResult, LearningRecord, Evidence, Source (§4, §26) | **PLANNED** — nothing beyond the assessment/thesis types |
| Coherent simulated 34-room property dataset (§5) | **PLANNED** — the Python proof-of-concept in `.claude/brands/anesis/prototype` has a minimal one; must be rebuilt in TS with internal consistency checks |
| Diagnosis with potential / attainable / actual and explicit deduplication (§6) | **PLANNED** |
| Limiting-constraint engine with causal dependency (§7) | **PLANNED** (rule exists only in the Python proof-of-concept) |
| Forward exposure with modelled probabilities labelled as such (§8) | **PLANNED** |
| Value-of-information engine (§9) | **PLANNED** (Python proof-of-concept only) |
| Intervention generation, risk-adjusted allocation, blocking with stated conditions (§10–11) | **PLANNED** |
| Decision log with alternatives, rejected actions, evidence, "what would change this" (§12, §22) | **PLANNED** |
| Pre-registered, immutable, versioned measurement plans (§13) | **PLANNED** (hash idea in the Python proof-of-concept) |
| Causal measurement: synthetic control with placebo test; INCONCLUSIVE as a valid outcome (§14) | **PLANNED** (Python only; needs a TS NNLS implementation or a small dependency) |
| Learning records and calibration that only claims an update when one happened (§15, §33) | **PLANNED** |
| Engine event emission with real timestamps (§18, §20) | **PLANNED** — `@anesis/events` exists; the engine must publish through it |
| Orb / core driven by engine state (§2, §19) | **PLANNED** — no orb exists; framer-motion is available |
| Ask Anesis answering from structured state (§21) | **PLANNED** — the current chat is fake |
| Evidence inspector, scenario lab, comparison mode, memory view, full-cycle runner, reset/repeat (§23, §29–33) | **PLANNED** |
| Risk-based autonomy levels 0–4 (§28) | **IMPLEMENTED as T0–T5** in `@anesis/policy` — map the brief's levels onto the existing tiers rather than duplicate |
| LLM interpretation layer (§17) | **PLANNED**; pattern already established in `assessment/report.ts` (LLM describes frozen numbers). No API key is present in this environment: `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` are **not set**. The layer will be built behind an adapter with an explicit "LLM interpretation not enabled" state |
| Voice (addendum A–E) | **PLANNED**. Browser Web Speech API (speech-to-text and text-to-speech) is available without keys and is real; true realtime, interruptible, server-side voice requires a realtime speech API and credentials that are **not available here**. Plan: real browser STT/TTS wired to the engine now; realtime adapter contract behind env vars; interruption handled at the client; governance applied to every voice intent |
| Video analysis (§24) | **PLANNED as contract only**: no vision model is available in this environment; the UI will say so |
| External connectors (§25) | **IMPLEMENTED for public sources**, PLANNED for PMS/GA4/ads/CRM; all labelled SIMULATED in the prototype |
| Knowledge graph, portfolio memory, data rights fields, multi-tenant (addendum F–M) | Tenant isolation **IMPLEMENTED** (RLS by mandate). Data-rights fields, memory levels and graph: **PLANNED** |
| Tests for the engine (§36) | **PLANNED**; vitest infrastructure in place |
| Documentation set (§37) | **PLANNED**; this audit is the first file |

## 4. Environment and tools available

- Node 22, pnpm 9 (via corepack), Python 3 with numpy/scipy (used for the proof-of-concept only).
- Chromium + Playwright installed (UI tests possible).
- Outbound HTTPS through a proxy; no LLM or speech API keys configured. Anthropic's Claude API can be used **only if** an API key is provided via environment variable; none is hard-coded and none will be.
- PGlite for tests; real Postgres only in CI.

## 5. Decisions taken for the build

1. **Build in this repository**, as a new package `packages/engine` (deterministic core, no DB, no LLM, no UI), consumed by `apps/web` through server routes that persist via `@anesis/db` and emit through `@anesis/events`. This respects the existing separation collect / score / report and the instruction not to rewrite the project.
2. **Governance = `@anesis/policy`.** Engine actions that would execute anything pass through `authorize()`. The engine itself only ever *simulates* interventions in the demo environment.
3. **Measurement in TypeScript**, not by shelling out to Python: a small non-negative least-squares solver (projected gradient or Lawson–Hanson) with in-space placebo tests, so the engine has no runtime dependency on Python.
4. **The mocked studio hub is replaced**, not patched: the activity feed becomes the real engine event stream; the chat becomes Ask Anesis answering from the decision log.
5. **Every number carries provenance** (source, timestamp, formula, assumptions, confidence, status) from the observation layer upward; the UI never displays a number that has no `Evidence` id.
6. **Simulated data is labelled SIMULATED PROPERTY DATA** in every view.

## 6. Build order (incremental, each step tested and committed)

1. `packages/engine`: data model with provenance; simulated property generator with consistency checks; observation layer.
2. Diagnosis (potential / attainable / actual, dedup), limiting constraint, forward exposure.
3. Value of information; interventions; risk-adjusted allocation with blocking; decision log with "what would change this".
4. Pre-registration (hashed, versioned); measurement (synthetic control, placebo, INCONCLUSIVE); learning records and calibration.
5. Engine event bus with real timestamps; full-cycle runner; deterministic by seed; scenario and comparison APIs.
6. `apps/web`: server routes; the core (orb) driven by engine state; event stream; evidence inspector; scenario lab; comparison; memory view; report.
7. Ask Anesis from structured state; LLM interpretation adapter (off without key); browser voice wired to the same intents, with governance.
8. Tests across all layers; documentation set; demo script.

Nothing in the list above is claimed done until its tests pass and the acceptance test in §40 of the brief can be performed.
