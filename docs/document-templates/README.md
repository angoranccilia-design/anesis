# Anesis — Premium document templates (reference)

These are the **finished, premium reference designs** for the client-facing documents.
They are self-contained HTML (embedded logo + Pinyon Script font), en-GB, £, marked as
illustrative specimens (fictional property "Wren & Wold House"). Each has a working
**Download PDF** button (`window.print()`).

| File | Document |
|------|----------|
| `acquisition-thesis.html` | **The Acquisition Thesis** / Leak Index audit — 14 pages: cover, exec summary, what's working, methodology, scorecard, per-pillar deep-dive, booking funnel, distribution & rate parity, social audit, quick wins + "fix this first", 90-day plan, financial projection, Growth/Domination comparison (Domination recommended). |
| `monthly-report.html` | Monthly recovery report (kept-out-of-platforms figure, work + result per channel, ledger, funnel, next month). |
| `services-agreement.html` | Mandate contract — precise deliverables per formula, anti-avoidance incentive, strict payment policy, 3-month performance break (pro-rata), Schedule 1 (commercial) + Schedule 2 (access), premium signature blocks. |
| `letter-of-intent.html` | LOI — non-binding, valid 12 months, term summary, signatures. |
| `invoice.html` | Monthly invoice — subscription + UK VAT only (ads paid by client directly to Meta/Google), end-of-month due date. |
| `receipt.html` | Payment receipt — PAID stamp, balance £0. |

## Status & plan
- **These are the design reference to KEEP.** Do not lose them.
- The app currently generates a **minimal, data-driven** version of the Thesis at
  `apps/web/app/documents/thesis/[id]/route.ts` + `apps/web/lib/documents/thesis-html.ts`
  (only the sections backed by real data: leak index, priced/recoverable per pillar,
  90-day plan, terms).
- **When real client data is available** (assessment via Apify + PageSpeed for scorecard /
  per-pillar / social / speed; client account access at mandate stage for funnel / channel
  mix / rate parity), **enrich the generator to match these templates' full depth**, using
  these files as the visual reference.

## Published (claude.ai artifacts)
- Thesis: https://claude.ai/code/artifact/e4347026-c0d4-47a9-88b6-6577fa56c126
- Monthly report: https://claude.ai/code/artifact/8ad177f4-c629-4dd0-b427-2be6c37a96be
- Contract: https://claude.ai/code/artifact/a8d8f23f-1102-4465-a54e-16e615999656
- LOI: https://claude.ai/code/artifact/a11c0a1c-9407-4f56-998c-6c4cf079dddb
- Invoice: https://claude.ai/code/artifact/b0e49e5b-e381-431a-8458-0f2e2aecf011
- Receipt: https://claude.ai/code/artifact/a9dd374e-7080-48e6-a9e1-e825321095d5
