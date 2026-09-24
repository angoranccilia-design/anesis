# Measurement method

## Why synthetic control

One treated property, no randomisation, weekly room revenue for 104 pre-weeks, 10 untreated comparables. A weighted combination of comparables (weights ≥ 0, Σ = 1, fitted on the pre-period) reproduces the property's pre-period better than any single comparable or a before/after comparison, and in-space placebo fits give an honest error without distributional assumptions.

## Procedure (`measure.ts`)

1. **Pre-registration first.** The plan (metric, window, baseline, expected range, success and stopping rules) is hashed before any post-period value is seen. `measure` verifies the hash and reports `planIntact`.
2. **Fit.** Columns scaled by pre-period means; sum-to-one enforced as a heavily weighted row; non-negative least squares by coordinate descent.
3. **Effect.** observed post-period ÷ counterfactual post-period − 1.
4. **Placebos.** The same estimator applied to each comparable as if treated; their standard deviation is the standard error; the property's absolute effect is ranked among all units.
5. **Interval.** 90 % = effect ± 1.645 × se, in £ on the counterfactual.
6. **Status.** ESTABLISHED if the interval excludes 0 and the property ranks first among 11 units; PROVISIONAL if only one of the two holds (or rank first with P(effect > 0) > 0.9); INCONCLUSIVE otherwise. Plan status: VALIDATED / PARTIALLY_VALIDATED / NOT_VALIDATED by the registered rule.

## What the simulation shows (UNVALIDATED on real data)

- Zero true effect: INCONCLUSIVE on 9–12 of 12 seeds; never VALIDATED. The remaining seeds are the expected false-positive rate of a 90 % interval and are reported, not hidden.
- +12 % true effect: interval covers the truth on ≥ 9 of 12 seeds; never INCONCLUSIVE.
- Earlier Python simulation (see `.claude/brands/anesis/stress-test/03-faisabilite-technique.md`): +10 % detectable in 26–52 weeks; +5 % needs 52 weeks; +3 % is not measurable on one property; precision does not improve beyond ~10 comparables. Hence annual settlement and a neutral zone equal to measured uncertainty.

## Limits

Comparables are simulated here. On real properties: comparables must be untreated and share the market; regional shocks that hit the property but not the donors bias the estimate; the window cannot be shortened after registration; effects below the noise floor cannot be established on a single property.
