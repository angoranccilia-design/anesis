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
