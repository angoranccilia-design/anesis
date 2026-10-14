# First Commercial Assay on a real export — runbook

Who: the founder with one establishment. What it proves: that Anesis reads real data honestly, assesses only what the data support, prepares a governed contract, and records a human-controlled intervention with proof, cost and an observed result. What it does not prove: commercial value or causality.

## 1. What the establishment provides

| Item | Why | Without it |
|---|---|---|
| Reservations export, **at least 12 months**, one row per reservation: id, arrival, departure, status, room revenue in GBP, channel; commission per reservation if the PMS has it | occupancy, ADR, channel mix, the weekly history, cancellations | under 90 days nothing is annualised (WINDOW_TOO_SHORT); under 365 days annual totals are projections |
| OTA commission statements (or a channel-manager report) if commission is not in the export | the only constraint assessable from a PMS export alone (OTA dependency) needs the commission rate | the OTA constraint is withheld |
| The number of sellable rooms | occupancy | nothing beyond room nights |
| The date the export was produced | recency statement | the import date stands in and the statement says so |
| Benchmarks with a source for the OTA constraint: `ota_share.target`, `ota.shiftable.low`, `ota.shiftable.high` (what share of OTA nights a well-run comparable independent keeps, and what share can move to direct in a year), each with the document and date | a constraint is assessable only against a documented benchmark | the constraint is withheld and says which benchmark it needs |
| Later: GA4 access (service account, viewer), booking engine funnel, CRM counts | conversion, demand and retention constraints | they stay withheld, with the exact metric names listed |

Anonymise names and contacts before sending: the reader uses none of them.

## 2. Run

```
anesis-runtime property PROP-xxx --file spec.json        # id, name, type, location (lat/lon), rooms; figures are not needed here
anesis-runtime assay export.csv --property PROP-xxx --rooms 40 --registers registers.json --collected-at 2026-10-01T18:00:00Z
```
`registers.json`: `{ "benchmarks": { "ota_share.target": { "value": 0.35, "source": "<document, page>", "asOf": "2026-..." }, ... } }`.

The output lists: the import verdict and what it cannot compute; the profile the data gave (rooms, ADR, occupancy, OTA share); the constraints assessed with their gap; the constraints withheld with what each needs; the binding constraint; every intervention's status and reason; the contracts prepared.

## 3. Read it honestly

- "withheld" is the normal result for conversion, demand and retention on a PMS export alone. It is not a failure of the data: it is the system refusing to conclude without them.
- A gap is an annual figure in pounds against the declared benchmark; its two ends are the declared shiftable range.
- An intervention BLOCKED "NOT ASSESSABLE" carries a DATA_REQUEST naming the metrics and benchmarks to supply.

## 4. The intervention, by humans

In the console, signed in: Submit → Authorise (amount) → Start → Declare executed (a checkable reference: ticket, deployment, invoice; actual spend if known) → Measure (after the window, with a new import covering those weeks) → Close. Every step is recorded under the signed-in operator; the engine cannot authorise, and demo mode cannot either.

## 5. The result, by the system

"Observed change": post-window mean weekly revenue vs pre-window, scaled by the prior year's movement when a second year of history exists; labelled NOT_ESTABLISHED. It is what happened on the property's own history. It is not what the intervention caused.
