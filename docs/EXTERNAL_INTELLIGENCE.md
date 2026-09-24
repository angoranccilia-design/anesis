# External intelligence

*How Anesis understands the world around a property, and why most of it is allowed to say nothing.*

## Principle

An external signal is never a fact about the property. It is an observation about the environment, with a source, a date, a geography, a frequency, a data quality and a status. It may influence a decision only after passing the relevance test below, and the correct answer is often **NO MATERIAL DECISION IMPACT**. Nothing is displayed because it is pretty.

## Signal model (`packages/engine/src/context/types.ts`)

`ExternalSignal { id, domain, name, metric, value, unit, geography, observedAt, validFrom, validTo, horizonDays, freshness, quality, source, status, confidence, detail, evidence }`

`DataQuality { completeness, reliability, ageHours, expectedFreshness, stale, note }` with freshness classes REAL_TIME · HOURLY · DAILY · WEEKLY · MONTHLY · HISTORICAL · STATIC. A signal is **stale** when its age exceeds the tolerance of its class (e.g. DAILY > 36 h). Stale data is labelled `STALE DATA — …` and halves the reliability used everywhere downstream.

`CommercialAssessment` is what a domain module concludes from its signals before the relevance test: affected demand type, affected capacity, direction, £ effect range over a horizon, causal plausibility (declared per rule), formula, assumptions, and a **perturbation** — how the assessment would change the decision's inputs if it were real.

## Relevance engine (`context/relevance.ts`) — the mathematics

| Symbol | Definition | Range |
|---|---|---|
| R | reliability = completeness × source reliability × (0.5 if stale) | 0–1 |
| C | causal plausibility declared by the domain rule | 0.25 / 0.5 / 0.75 / 1 |
| M | economic magnitude = midpoint of the assessment's £ effect over its horizon | ≥ 0 |
| E | expected effect = R × C × M | £ |
| τ | materiality = max(0.5 % of annual room revenue, £1,000) | £ |
| DIS | decision impact score = E ÷ τ | ≥ 1 means material |
| Δ | decision sensitivity: the decision is **re-run** with the perturbation applied; Δ = 1 if the binding constraint, the funded set or the blocked set changes | 0 / 1 |

Verdicts: DIS < 1 → **NO_MATERIAL_DECISION_IMPACT**; DIS ≥ 1 and Δ = 0 → **MATERIAL_NO_DECISION_CHANGE** (tactical note); DIS ≥ 1 and Δ = 1 → **DECISION_IMPACT** → forward exposure (down) or commercial opportunity (up). The formula with its numbers is printed with every verdict. The score is not arbitrary: E is an expected £ value and τ a declared threshold; Δ is a computation.

## Fusion (`context/fusion.ts`)

Assessments are fused per domain and, when several fall within 30 days, as a near-term cluster: signed effects are summed and the net is tested with the same relevance rule, so a cluster of small effects can matter when none does alone. Output per scope: FORWARD_EXPOSURE · COMMERCIAL_OPPORTUNITY · TACTICAL_NOTE · NO_DECISION_IMPACT.

## Domains

| Domain | Module | Rule (declared assumptions) | Connector state here |
|---|---|---|---|
| Weather | `weather.ts` | days classified exceptional / poor / neutral; elasticities by property type (country house: +15–35 % of free weekend rooms on exceptional days, 5–12 % of occupied rooms at risk on poor days; glamping: ±20–40 %; spa: rain **raises** demand); forecast confidence falls 4 points per lead day | **CONNECTED** (Open-Meteo, 14-day daily) |
| Seasonality | `seasonality.ts` | week-of-year index from the property's own history, phases by terciles, holidays from the calendar; statement "demand usually increases in this period"; **never causal** | history: SIMULATED; holidays **CONNECTED** (gov.uk) |
| Events | `events.ts` | capture rate by distance (0.4 % ≤ 10 km, 0.15 % ≤ 30 km, 0.04 % ≤ 60 km) × nights, capped by free rooms; rate uplift 0–25 %; without attendance and distance → INSUFFICIENT EVIDENCE, effect 0 | contract (PredictHQ / Ticketmaster) + operator register |
| Search | `search.ts` | 8-week index change vs prior 8 weeks; assessment only when search ≥ +15 % and direct revenue < +5 %; **search interest ≠ revenue** | NOT CONNECTED (no official Trends API) |
| Macro | `macro.ts` | FX: 0.3 % of revenue per 1 % GBP move — a single observation measures no move, so no impact is asserted; inflation: 0.6 % of revenue per point on the cost base | FX **CONNECTED** (ECB via Frankfurter); inflation / bank rate NOT CONNECTED (endpoints failed from here) |
| Competitive | `competitive.ts` | comparable-set rate vs ADR; ≥ 10 % undercut → 3 % of revenue at risk; stale → confidence halved; **attribution test** from weekly histories: internal / environmental / mixed / no change | contract (licensed rate shopping) + operator observations; no scraping |
| OTA | `ota.ts` | share trend ≥ +3 pts and conversion attainment < 85 % → margin exposure = revenue × trend × [1, 2] × commission | contract (channel manager) |
| Operations | `operations.ts` | capacity binds at peak occupancy ≥ 92 %; operations bind below 85 % staffing coverage; cancellations, no-shows, slot utilisation | in the simulated PMS; snapshot register for operators |
| Vision | `vision.ts` | camera source → stream → frame sampling → vision model → structured observation → confidence → engine; observations cannot carry identity fields | **SOURCE NOT CONFIGURED** |

## What the connectors report

Every connector is a `ConnectorContract { id, domain, name, provider, kind, requires[], freshness, status, statusNote, lastFetchedAt, legal }` with status CONNECTED · NOT_CONNECTED · SOURCE_NOT_CONFIGURED · ERROR · SIMULATED · OPERATOR_ENTERED. Connected today without credentials: weather, public holidays, exchange rates, geocoding. Contracts declaring their environment variables: PMS, booking engine, GA4, Google Ads, Meta Ads, CRM, RMS, OTA channel manager, events provider, search (Search Console), rate shopping, camera. Inflation and bank rate are live contracts whose endpoints failed from this environment; the failure is recorded, no value is invented.

Every run stores the exact context snapshot it used, so "run again" repeats the same decision even if the forecast has since changed.
