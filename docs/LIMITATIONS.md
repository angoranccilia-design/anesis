# Limitations — what this build is and is not

1. **All property data is simulated.** One synthetic 34-room country house and 10 synthetic comparables. Nothing here is a customer result, a sale, or revenue. The label "Simulated property data" is on every view and in the report.
2. **Benchmarks are placeholders.** Every value in `benchmarks.ts` has status BENCHMARK and must be replaced by a documented source before any real Assay.
3. **Confidences are declared priors.** They are adjusted only by measured cycles; none has yet been measured on a real property (UNVALIDATED).
4. **Exposure probabilities are modelled assumptions**, not estimates from data.
5. **Persistence is process memory.** Runs and memory are lost on server restart; database persistence through `@anesis/db` is PLANNED (interface in `store.ts`).
6. **No live connectors.** PMS, analytics, CRM and advertising adapters are PLANNED; credentials would be supplied through environment variables only.
7. **Language layer off.** Without `ANTHROPIC_API_KEY`, answers are shown as structured facts only. With a key, the model may only restate those facts.
8. **Voice is browser-dependent.** Recognition and synthesis use the browser's Web Speech API; some browsers (and headless Chromium) have none, and the panel says so. Server-side realtime voice is PLANNED.
9. **Video analysis is not implemented.** The contract is documented; the UI says it is not enabled.
10. **Measurement windows are simulated.** In practice 52 weeks must elapse; effects below ~5 % on one property are not measurable.
11. **Portfolio learning, knowledge graph, data-rights fields, multi-property abstraction** are PLANNED.
12. **The "Run again" determinism** holds for identical seed, inputs and memory; using memory that grew between runs is a different input and is shown as such.
13. **Interventions are four fixed candidates** derived from the constraints; a property-type-specific catalogue is PLANNED.
14. **Languages.** Ask Anesis detects the question's language; answer templates are complete in English and French; Spanish, German, Italian, Portuguese and Dutch are detected and answered in English with a notice. Engine record text (intervention names, block reasons, formulas) is English. Full translation requires the language layer (LLM) when enabled. Voice follows the selected language.
15. **No claim of endorsement, certification or assurance** is made anywhere in the product; "Commercial Assay by Anesis" is brand language only.
