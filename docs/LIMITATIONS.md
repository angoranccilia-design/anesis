# Limitations — what this build is and is not

1. **All property data is simulated.** One synthetic 34-room country house and 10 synthetic comparables. Nothing here is a customer result, a sale, or revenue. The label "Simulated property data" is on every view and in the report.
2. **Benchmarks are placeholders.** Every value in `benchmarks.ts` has status BENCHMARK and must be replaced by a documented source before any real Assay.
3. **Confidences are declared priors.** They are adjusted only by measured cycles; none has yet been measured on a real property (UNVALIDATED).
4. **Exposure probabilities are modelled assumptions**, not estimates from data.
5. **External connectors.** Live without credentials: weather (Open-Meteo), public holidays (gov.uk), exchange rates (ECB via Frankfurter), geocoding. All others are contracts with declared environment variables and report NOT CONNECTED; inflation and bank-rate endpoints failed from this environment and are recorded as such. Operator registers exist for events, competitor observations, operations and OTA snapshots.
5e. **Interventions are prepared, never executed, and have met only synthetic cycles.** No tool acts on a real system; execution evidence is whatever a human records; outcome assessment has not been run on a real measurement (`docs/EXECUTION.md`).
5d. **The PMS reader has met only synthetic files.** Field vocabularies, channel and status words and date handling are generic; they will be adjusted on the first real anonymised export (`docs/INGESTION.md`).
5c. **The runtime runs one property per worker configuration** and has no execution tools or post-action verification yet (`docs/RUNTIME.md`).
5b. **The property model is persisted (file store by default; Postgres through the runtime when `DATABASE_URL` or `ANESIS_PGLITE_DIR` is set); full run records are not.** The model (spec and its history, calibration, every cycle's decision, pre-registration hash, budgets, measurement, memory) is written to one JSON file per property through `ModelStore` (`persist.ts`; file store in `apps/web/lib/engine/fileStore.ts`, directory `ANESIS_DATA_DIR`). It survives restarts and feeds the next cycle. Full run records with their external-context snapshots stay in process memory; a database store can replace the file store behind the same interface.
6. **No live connectors.** PMS, analytics, CRM and advertising adapters are PLANNED; credentials would be supplied through environment variables only.
7. **Language layer off.** Without `ANTHROPIC_API_KEY`, answers are shown as structured facts only. With a key, the model may only restate those facts.
8. **Voice is browser-dependent.** Recognition and synthesis use the browser's Web Speech API; some browsers (and headless Chromium) have none, and the panel says so. Server-side realtime voice is PLANNED.
9. **Camera / vision.** The abstraction, the identity-data guard and the governance document exist; no source is connected and none is simulated: the console says CAMERA SOURCE NOT CONNECTED.
10. **Measurement windows are simulated.** In practice 52 weeks must elapse; effects below ~5 % on one property are not measurable.
11. **Portfolio learning, knowledge graph, data-rights fields, multi-property abstraction** are PLANNED.
12. **The "Run again" determinism** holds for identical seed, inputs and memory; using memory that grew between runs is a different input and is shown as such.
13b. **External rules are declared elasticities**, not measured ones: weather, event capture, search, competitor and OTA effects carry assumptions and a plausibility, and are UNVALIDATED on real properties.
13. **Interventions are five fixed candidates** derived from the constraints; a property-type-specific catalogue is PLANNED.
14. **Languages.** Ask Anesis detects the question's language; answer templates are complete in English and French; Spanish, German, Italian, Portuguese and Dutch are detected and answered in English with a notice. Engine record text (intervention names, block reasons, formulas) is English. Full translation requires the language layer (LLM) when enabled. Voice follows the selected language.
15. **No claim of endorsement, certification or assurance** is made anywhere in the product; "Commercial Assay by Anesis" is brand language only.
16. **Commercial model.** Partnership terms, funding model and providers are operator-entered; estimated intervention budgets are declared engine estimates; approved budgets, provider costs, actual spend and Anesis revenue are UNKNOWN until recorded by a human. No contract or billing system is connected.

## Coherence corrections, 14 October 2026 (C1, C2, C3, C6)

Four defects demonstrated by the end-to-end audit were corrected; the rest of the audit's list (C4, C5, C7 to C12) stands. What remains after the corrections:

- **C1.** The 90-day minimum bounds the seasonal bias of a projection; it does not remove it. Between 90 and 364 days annual totals are MODELLED projections and the cycle says so. Nothing in the engine yet seasonally adjusts a partial-year window.
- **C2.** The collection date is declared by the operator; when absent, the import date stands in and the statement says so. No threshold calls an export "too old": the gap is reported, the decision is dated by the period end.
- **C3.** Who the human is remains declarative (C4): the lifecycle checks the budget, not an identity. Actual spend and provider cost are not kept on the contract and come back UNKNOWN from `budgetFromContract`.
- **C6.** The engine knows committed interventions only through what the runtime reads from the `interventions` table; the console does not yet pass open contracts (it has none: only the runtime persists contracts). A dependant of an intervention in progress stays BLOCKED until that intervention is measured. The runtime no longer simulates outcomes, so calibration grows only from real MEASURED contracts, of which there are none yet.
- All tests are on synthetic data and prove behaviour, not commercial value. No real property data has been read.

## Towards a real Commercial Assay, 14 October 2026 (chantiers A–G)

Done and tested on synthetic data: API behind operator sessions (or an explicit demo flag), session revocation, mandate and property grants; one truth across worker, console, imports and memory; `verified_only` evidence policy on real properties (constraints withheld with what they need, no simulated effect shown, spec and weekly history from the data, no simulated outcome); honest connector statuses with ONS and Bank of England really fetched; proofs, actual cost and observed result on contracts with the session operator as actor; health, logs, backups, Dockerfile, compose, CI builds; `assay` command and runbook.

What remains, and is said:
- No real property has been processed. Benchmarks are to be declared by the founder with a source; without them the OTA constraint is withheld.
- Conversion, demand and retention constraints need GA4, a booking engine funnel or a CRM: no adapter exists; they stay withheld on a PMS export alone.
- Observed change is on the property's own history, seasonally scaled only when a prior year exists; never incremental.
- The console serves one property (ANESIS_PROPERTY_ID); multi-property navigation is not built. The interventions page is minimal (prompts, no forms).
- Nothing has been deployed to a host; Docker artefacts are written and the console build passes in CI, but no container has been run here.
- Open-Meteo free tier is non-commercial; a paying client needs a commercial plan or Met Office DataHub.
- The language layer stays off without a key; it only rephrases.
