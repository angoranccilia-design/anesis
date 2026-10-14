# Ingestion — the generic PMS export reader

**STATUS: IMPLEMENTED** (`packages/ingest`, Étape 2 of the autonomous system). A technical step, not a commercial validation: it has been exercised only on synthetic files written for its tests. Validation starts with a real anonymised export.

## What it does

`importPmsExport({ filename, content, rooms, mapping?, dateOrder?, fxToGbp?, period? })` reads a CSV (any delimiter, quotes, BOM) or an XLSX (first sheet, Excel serial dates) and returns, deterministically for the same bytes and options:

- **provenance**: SHA-256, size, format, delimiter or sheet, row count, import time, date order used, every declared option;
- **mapping**: which header was taken for which field (exact, contains, or declared) and which headers were left unmapped. Fields are detected from English and French PMS vocabularies; nothing is inferred from values;
- **fields available and missing**, by name;
- **period** covered by the kept stays, with the share of days that have at least one night;
- **counts**: rows, kept, cancelled, no-shows, exact duplicates, modified versions, conflicting versions, other exclusions;
- **issues**: each kind with a count, up to three examples and its effect on the totals;
- **metrics** with their **basis**: room nights, GBP revenue, ADR, occupancy, RevPAR, OTA share, cancellation rate, median booking window, peak occupancy;
- **channels** with their class (OTA, direct, other, unclassified);
- **snapshot**: a `PmsSnapshot` the engine already understands, or `null` when rooms or room nights are unknown;
- **quality** (`DataQuality`) and a **sufficiency** statement: what can be computed, what cannot and why, and the next data needed.

## Rules it enforces

- A field the file does not have is **null, never zero**: the engine then produces no observation for it (`observationsFromSystems`), the simulated or declared value stays flagged as such, and the data-requirements check reports it.
- Revenue in a currency without a declared GBP rate, or with no currency at all, makes the **total unknown**, not partial.
- Ambiguous day/month order is **reported**, and stay dates stay unknown until the format is declared.
- Exact duplicate rows are counted and dropped; several versions of one reservation keep the latest by modification date; conflicting active stays without a modification date are kept by file order and **flagged for human review**.
- Cancellations and no-shows leave the sold set and are counted. Departure before arrival, missing dates and unreadable values exclude the row from the total they would corrupt, and are listed.
- **Window** (C1): what the covered period can establish. Window figures (occupancy, ADR, channel mix over the window) are observed for the window. Annual totals are observed only over a full year (365 days), are **projections** (engine status MODELLED, seasonal bias named) between 90 and 364 days, and are **not derived at all** under 90 days: the verdict is then WINDOW_TOO_SHORT and the engine takes only the room count from the file. The 90-day minimum is a judgement (a quarter spans at least one seasonal transition), not a guarantee; only a full year removes the bias.
- **Three dates** (C2): the observed period's end, the export's collection date (`--collected-at`, declared, else unknown) and the import date are kept apart in `recency`. A file is a historical record: its freshness class is HISTORICAL, it is never STALE, and the quality note says how many days after the period end it was exported and imported.
- The reader also produces the property's **weekly history** (ISO weeks: room nights and revenue, null when a stay's revenue is unknown) and the **average stay**; under `verified_only` the engine runs seasonality, plausible ranges and the observed change on that history, and derives the average booking value from ADR × average stay.
- OTA share is computed only when unclassified channel names carry at most 10 % of nights. Peak occupancy only over a window of at least 28 days with 90 % coverage. The room count is **declared by the operator**, never inferred from the file.

## Through the runtime

`anesis-runtime import <file> --rooms N [--date-order DMY|MDY] [--fx EUR=0.85] [--collected-at ISO]` stores the full result in `pms_imports` with its hash and traces it. The next `collect` reads the latest import and the engine's next cycle marks the PMS metrics it carries as VERIFIED, with the PMS connector reported CONNECTED (file import). Everything else about the property stays simulated and the cycle says so.

## What a reservations export can and cannot establish

Can: room nights, occupancy (with declared rooms), ADR and RevPAR (with GBP revenue), channel mix and OTA share, cancellation rate, booking window. Cannot: OTA commission (needs statements or a channel-manager report), margin, incrementality, causes of a change. The first pilot should therefore provide an export that reconciles reservations with revenue, plus the commission statements, and cover at least a full year (twelve months of reservations) so that annual figures are observed rather than projected.
