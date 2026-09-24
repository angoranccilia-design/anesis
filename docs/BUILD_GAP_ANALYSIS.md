# Build gap analysis — before the final build

*24 September 2026, written after re-reading the repository at commit `d79fd31` (engine + console), before any further change. It supersedes nothing in `IMPLEMENTATION_AUDIT.md`; it classifies the current state into the four categories the Final Build Challenge asks for. The same file is updated at the end of the build (§5).*

## A — genuinely functional (real logic, tested, no data invented)

| Item | Where | Evidence |
|---|---|---|
| Deterministic methodology loop: observation → diagnosis → constraint → exposure → VOI → allocation → decision → pre-registration → measurement → learning | `packages/engine/src/*.ts` | 32 tests; same seed + inputs + memory → identical output |
| Provenance on every record (source, timestamp, formula, assumptions, confidence, status, evidence ids) | `model.ts`, `property.ts`, `diagnose.ts` | test "every observation carries provenance" |
| Explicit deduplication rule and limiting constraint by causal chain (demand consumed by conversion) | `diagnose.ts`, `allocate.ts` (`CONSUMED_BY`) | tests "deduplicates", "blocks paid acquisition while conversion binds", "unblocks … at benchmark" |
| Value of information (EVPI/EVSI) and Assay verdict | `voi.ts` | 3 tests |
| Risk-adjusted allocation with reserve and ACTION BLOCKED reasons + required condition | `allocate.ts` | tests |
| Pre-registered plan hashed (SHA-256), versioned | `register.ts` | tests |
| Synthetic control + placebo inference; INCONCLUSIVE is a real outcome; never forced positive | `measure.ts` | tests on 12 seeds each way |
| Learning record; calibration only when changed; shrinkage n/(n+3) | `learn.ts` | tests |
| Engine event bus with real timestamps and engine state | `bus.ts` | test |
| Governance through `@anesis/policy.authorize()` for every typed/spoken intent; fund = T3, not executed | `apps/web/lib/engine/governance.ts`, `ask/route.ts` | acceptance step 11 |
| Ask Anesis from structured records only; "Insufficient evidence" otherwise; en/fr | `apps/web/lib/engine/ask.ts` | acceptance steps 9–11 |
| Console driven by real engine events (SSE); core state = last engine event; evidence inspector; scenario lab; run comparison; report | `apps/web/components/engine/*`, `app/api/engine/*` | 18-step acceptance run |
| Browser voice (Web Speech) with interruption, same route and policy as text | `AskPanel.tsx` | real when the browser supports it; declared unavailable otherwise |
| Existing platform: domain model, DB with RLS, events table, policy tiers, planning, assessment scoring, public-signal collectors, auth | `packages/*` (pre-existing) | 253 tests |

## B — functional but simulated (real computation on generated or placeholder inputs, labelled)

| Item | Where | What is simulated |
|---|---|---|
| Property data (41 observations, 156-week series, 10 comparables) | `property.ts` | all values; labelled SIMULATED / MODELLED; no VERIFIED observation exists |
| Benchmarks | `benchmarks.ts` | placeholders, status BENCHMARK |
| Intervention candidates (four fixed) and their confidence priors | `interventions.ts` | declared priors; effect ranges as fractions of gaps |
| Exposure probabilities | `exposure.ts` | modelled assumptions |
| Measurement outcome | `measure.ts#applyOutcome` | the 52-week outcome is simulated with the truth hidden from the estimator |
| Persistence of runs and memory | `apps/web/lib/engine/store.ts` | process memory; lost on restart |
| Data connectors panel | console | lists simulation sources only; no connector contract, no status model |

## C — interface without real logic behind it

| Item | Where | Gap |
|---|---|---|
| "Video analysis is not enabled" panel | console | honest text, but no camera/vision abstraction, no observation contract, no governance document |
| Data connectors panel | console | no contract, no freshness, no data-quality model, no unavailable state per source |
| Scenario lab | console | six inputs only (seed, budget, mobile conversion, OTA share, repeat rate, one benchmark); no ADR / occupancy / traffic / marketing spend / weather / demand / capacity; no "what changed the decision" explanation |
| "What would change this decision" | `decision.ts` | thresholds are the benchmark and break-even confidences, not thresholds found by re-running the engine; not tied to capacity or margin conditions |
| Memory view | console | shows learning records; no decision history, no "considered and rejected on … because …" recall |
| Ask Anesis intents | `ask.ts` | no "show me", "compare Google and Meta", "which assumption drives this", "run that scenario", amount-aware "launch £20,000" |

## D — totally absent

| Capability (challenge §) | Status before this build |
|---|---|
| External signal model with source, date, geography, frequency, freshness, quality, relevance, decision impact (§3, §22, §29, §30) | absent |
| Connector contracts with explicit CONNECTED / NOT CONNECTED / SOURCE NOT CONFIGURED states for PMS, booking engine, GA4, Google Ads, Meta, CRM, RMS, OTA, weather, events, search, economic, maps, competitor, camera (§28) | absent |
| Weather intelligence as a commercial variable by property type (§4) | absent |
| Seasonality layer (high/shoulder/low, weekday/weekend, holidays, booking window, lead time, cancellations) with the seasonality ≠ causality rule (§5) | absent (seasonality only exists inside the simulated series) |
| Future events → forward exposure with evidence requirements (§6) | absent |
| Search / demand signals with the "search ≠ revenue" distinction (§7) | absent |
| Macro / economic context (§8) | absent |
| Competitive / market intelligence with the internal-vs-environment attribution question (§9) | absent |
| OTA dependency as a capital-allocation input with trend (§10) | partial (static E-002 only) |
| Operations / capacity representation and the five constraint kinds (§11) | absent (only demand / conversion / direct capture / retention) |
| Camera / computer-vision abstraction with privacy governance (§12, §31) | absent |
| Signal fusion and a documented relevance / decision-impact test that can say "no material decision impact" (§13, §14, §32) | absent |
| VOI "what information would most change this decision" (§15) | partial (per-intervention EVSI only) |
| Intervention control record with owner, dependency status, approval level, dates, outcome, forecast error, learning (§16) | partial |
| Governance levels L0–L4 with amount-aware classification of free-text commands (§17) | partial (intent classes only; no amount parsing) |
| Property memory with decision history and recall (§18) | partial (learning records only) |
| Portfolio memory with partial pooling and evidence-level distinction (§19) | absent |
| Sensitivity analysis ("which assumption drives this result") and threshold search (§23–24) | absent |
| Data freshness / quality affecting decision confidence (§29–30) | absent |
| Tests for weather, events, seasonality, competitor, capacity, governance, memory, scenario thresholds, connector failure states (§33) | absent |
| Docs: EXTERNAL_INTELLIGENCE, COMPUTER_VISION_GOVERNANCE, DATA_PROVENANCE, GOVERNANCE, METHODOLOGY (§Deliverables) | absent |

## What this environment can and cannot connect to (checked by request on 24 September 2026)

| Source | Reachable without credentials | Decision |
|---|---|---|
| Open-Meteo forecast and geocoding | yes (HTTP 200) | build a live connector: **WEATHER · CONNECTED**, **MAPS · CONNECTED** |
| gov.uk bank holidays JSON; Nager.Date public holidays | yes (200) | live connector: **PUBLIC HOLIDAYS · CONNECTED** |
| Frankfurter exchange rates | yes (200) | live connector: **FX · CONNECTED** |
| ONS CPIH observations API | no (HTTP 500 on the observations endpoint) | contract only: **INFLATION · NOT CONNECTED** (endpoint recorded) |
| Bank of England bank-rate CSV | returns an HTML consent page | contract only: **BANK RATE · NOT CONNECTED** |
| Google Trends | no official API | contract only: **SEARCH · NOT CONNECTED** |
| Events (Ticketmaster, PredictHQ) | keys required | contract + operator-entered event register |
| Competitor rates (rate-shopping providers, OTA pages) | contracts / terms of service required; no scraping | contract + operator-entered observations |
| PMS, booking engine, GA4, Google Ads, Meta, CRM, RMS, OTA extranets | credentials required | contracts, env-var names declared, **NOT CONNECTED** |
| Camera | no source | **SOURCE NOT CONFIGURED** |

## 5. Build plan derived from the gaps (in order)

1. External signal model, connector contract, freshness and quality (engine, pure). 2. Domain modules: weather, seasonality, events, search, macro, competitive, OTA, operations/capacity, vision. 3. Relevance engine and fusion. 4. Sensitivity and threshold search; VOI "most decision-sensitive unknown". 5. Constraint kinds and capacity blocking; quality-adjusted confidence in allocation. 6. Intervention control records; governance L0–L4 with amount parsing; property memory recall; portfolio pooling. 7. Live connectors in the app (weather, holidays, FX, geocoding) with snapshots stored per run; unavailable states for the rest. 8. Console: external context, fused verdicts, extended scenario lab with "what changed the decision", memory history, new Ask intents. 9. Tests (§33) and the 25-step acceptance run. 10. Documents.

## 6. State after the final build (same day) — the four exact lists

### Genuinely functional (real logic, tested)
Methodology loop end to end (observe → diagnose → constraint kinds → exposure → external relevance → VOI → prioritise → allocate with statuses → decide → pre-register → measure → forecast error → learn → remember → next decision). Deduplication rule; causal chain demand → conversion → capacity → operational with memory-resolved dependencies; five constraint kinds; sensitivity (±20 % re-runs) and threshold search by bisection; "what would change this decision" machine-readable; most decision-sensitive unknown with VOI; relevance engine (E = R × C × M vs τ, Δ by re-run) and fusion that says NO MATERIAL DECISION IMPACT; seasonality profile (non-causal) and attribution test; data-quality factor reducing confidence and EV; governance L0–L4 with amount-aware classification through `@anesis/policy` (voice and text); property memory with recall, decision history, failed hypotheses; portfolio partial pooling (off by default); intervention control records; Ask Anesis routed to engine functions (why, show me, worried, information value, scenario runs, compare channels, drivers, history, launch → ACTION BLOCKED); core driven by engine events; scenario lab (ADR, occupancy, traffic, conversion, OTA share, capacity, staffing, weather scenario, stale data, memory on/off) with "what changed the decision"; run comparison; report. Live connectors without credentials: weather, public holidays, exchange rates, geocoding. Engine: 59 tests; whole repository: all suites green; acceptance runs: 25-step (15/15 checks) and 18-step (18/18).

### Still simulated (labelled)
Property observations and the 156-week histories (SIMULATED PROPERTY DATA); the 52-week measurement outcome (truth hidden from the estimator); benchmarks (BENCHMARK placeholders); intervention priors and external elasticities (declared, UNVALIDATED on real properties); scenario weather when chosen in the lab (declared, not a forecast).

### External connectors ready to receive credentials (contract declared, state NOT CONNECTED)
PMS (`ANESIS_PMS_PROVIDER`, `ANESIS_PMS_API_KEY`, `ANESIS_PMS_PROPERTY_ID`) · booking engine (`ANESIS_BE_PROVIDER`, `ANESIS_BE_API_KEY`) · GA4 (`ANESIS_GA4_PROPERTY_ID`, `GOOGLE_APPLICATION_CREDENTIALS`) · Google Ads (`ANESIS_GADS_CUSTOMER_ID`, `ANESIS_GADS_DEVELOPER_TOKEN`, `ANESIS_GADS_REFRESH_TOKEN`) · Meta Ads (`ANESIS_META_AD_ACCOUNT_ID`, `ANESIS_META_ACCESS_TOKEN`) · CRM (`ANESIS_CRM_PROVIDER`, `ANESIS_CRM_API_KEY`) · RMS (`ANESIS_RMS_PROVIDER`, `ANESIS_RMS_API_KEY`) · OTA via channel manager (`ANESIS_CHANNEL_MANAGER_API_KEY`) · events provider (`ANESIS_EVENTS_PROVIDER`, `ANESIS_EVENTS_API_KEY`) · search (`ANESIS_GSC_SITE_URL`, `GOOGLE_APPLICATION_CREDENTIALS`) · rate shopping (`ANESIS_RATESHOP_PROVIDER`, `ANESIS_RATESHOP_API_KEY`) · camera (`ANESIS_CAMERA_<ZONE>_STREAM_URL`, SOURCE NOT CONFIGURED). Inflation (ONS) and bank rate (BoE) are live contracts whose public endpoints failed from this environment. The contracts declare what they need; the adapters that would parse each provider's payload are the remaining work per provider.

### Remaining limitations
See `LIMITATIONS.md`: process-memory persistence (DB seam ready); no live property data; external rules unvalidated; no provider adapters beyond the four open sources; camera not connected; server-side realtime voice planned; language layer off without a key; one simulated property, so portfolio learning is architecture only.

## 7. Stress-test follow-up — definition of done

| # | Demonstrated by | Test |
|---|---|---|
| 1 | several capacity types: rooms, housekeeping, treatment slots, therapists, treatment rooms, covers, kitchen, service staff, outdoor units, cleaning | `stress.test.ts` (capacity engine), `CAPACITY_ENGINE.md` |
| 2 | an operational constraint other than rooms: spa therapists at 82 % → attainable 82 %, utilisation 118 %, binds | stress 1 + spa |
| 3 | competitive demand compression: comparables +10–15 % ADR, 0 % available, event in 10 d, search +40 %, inventory retained → FORWARD EXPOSURE | stress 1 + competitors |
| 4 | observation / inference / decision separated: `compression.observed`, `.inferred` ("an inference, not an observed outcome"), `.decision` = INVESTIGATE, `.notYet` | same |
| 5 | sensitivity within plausible ranges with source and confidence per variable | `plausibleRanges`, stress 1 |
| 6 | "what would change my mind" uses those ranges: conversion ≥ 1.21 % inside 0.36–1.63 % | `decisionSensitivity` |
| 7 | external provider as executor: ABC Digital PROCEED on I-001 | `providerBriefs` |
| 8 | Anesis keeps the commercial logic: success threshold and measurement are Anesis's, the Meta agency is told DO NOT START | same |
| 9 | connectors ready without fabricated data: Tier-1 fields declared, states AUTHENTICATION_REQUIRED / NOT_CONNECTED / DATA_UNAVAILABLE, no value invented | `apps/web/lib/connectors`, `context.test.ts` |
| 10 | missing data identified before deciding: attribution confidence and contribution margin missing for acquisition → INVESTIGATE; stale CRM → refresh | `requirements.ts`, stress 1 |
| 11 | initial stress test still works | stress 1 replay |
| 12 | second property, different structure: spa resort → capacity binds, acquisition collides with capacity, off-peak programme emerges; conversion and CRM are not constraints | stress 2 |
