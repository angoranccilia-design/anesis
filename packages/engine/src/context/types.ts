/**
 * External intelligence — signal model, connector contracts, freshness and data quality.
 *
 * A signal is never a fact about the property; it is an observation about the world around it, with a source,
 * a date, a geography, a frequency, a quality and a status. The relevance engine (relevance.ts) decides
 * whether it matters to the decision at hand. A connector is a contract: it declares what it needs, and its
 * status is one of the explicit states below — never a fabricated connection.
 */
import type { Range, Status } from "../model.js";

export type Freshness = "REAL_TIME" | "HOURLY" | "DAILY" | "WEEKLY" | "MONTHLY" | "HISTORICAL" | "STATIC";
export const FRESHNESS_HOURS: Record<Freshness, number> = { REAL_TIME: 0.25, HOURLY: 2, DAILY: 36, WEEKLY: 24 * 8, MONTHLY: 24 * 40, HISTORICAL: Infinity, STATIC: Infinity };

export type ConnectorStatus = "CONNECTED" | "NOT_CONNECTED" | "SOURCE_NOT_CONFIGURED" | "ERROR" | "SIMULATED" | "OPERATOR_ENTERED";
export type Domain = "pms" | "booking_engine" | "web_analytics" | "google_ads" | "meta_ads" | "crm" | "rms" | "ota" | "weather" | "calendar" | "events" | "search" | "macro" | "maps" | "competitor" | "vision";

export interface DataQuality {
  readonly completeness: number;        // 0..1 share of expected fields/periods present
  readonly reliability: number;         // 0..1 declared reliability of the source for this use
  readonly ageHours: number | null;     // time since observation; null when unknown
  readonly expectedFreshness: Freshness;
  readonly stale: boolean;              // ageHours > FRESHNESS_HOURS[expectedFreshness]
  readonly note: string;
}

export function quality(completeness: number, reliability: number, ageHours: number | null, expectedFreshness: Freshness, note = ""): DataQuality {
  const stale = ageHours !== null && ageHours > FRESHNESS_HOURS[expectedFreshness];
  return { completeness, reliability, ageHours, expectedFreshness, stale, note: stale ? `STALE DATA — ${note || "older than its expected freshness"}` : note };
}
/** Single multiplier applied to confidences that depend on this data. Documented in DATA_PROVENANCE.md. */
export const qualityFactor = (q: DataQuality): number => Math.max(0, Math.min(1, q.completeness * q.reliability * (q.stale ? 0.5 : 1)));

export interface ConnectorContract {
  readonly id: string;                  // "CONN-WEATHER"
  readonly domain: Domain;
  readonly name: string;
  readonly provider: string;            // "Open-Meteo", "Booking.com Connectivity API", …
  readonly kind: "live" | "operator" | "simulation" | "contract";
  readonly requires: readonly string[]; // environment variable names; [] when none
  readonly freshness: Freshness;
  readonly status: ConnectorStatus;
  readonly statusNote: string;          // why it is in that state
  readonly lastFetchedAt: string | null;
  readonly legal: string;               // access terms / limits, in one sentence
}

export interface ExternalSignal {
  readonly id: string;                  // "SIG-WX-001"
  readonly domain: Domain;
  readonly name: string;
  readonly metric: string;
  readonly value: number;
  readonly unit: string;
  readonly geography: string;
  readonly observedAt: string;
  readonly validFrom: string;
  readonly validTo: string;
  readonly horizonDays: number;
  readonly freshness: Freshness;
  readonly quality: DataQuality;
  readonly source: string;              // connector id
  readonly status: Status;
  readonly confidence: number;          // 0..1, how it was set is in `detail`
  readonly detail: string;
  readonly evidence: readonly string[];
}

/** What a domain module concludes from its signals, before the relevance test. */
export interface CommercialAssessment {
  readonly id: string;                  // "CA-WX-001"
  readonly domain: Domain;
  readonly signalIds: readonly string[];
  readonly headline: string;
  readonly affectedDemandType: string;  // "leisure weekend", "last-minute spa", …
  readonly affectedCapacity: string;    // "rooms", "treatment slots", "none"
  readonly direction: "up" | "down" | "mixed" | "none";
  readonly commercialEffectGbp: Range;  // over the horizon, signed by direction in `magnitudeGbp`
  readonly horizonDays: number;
  readonly causalPlausibility: number;  // 0.25 / 0.5 / 0.75 / 1 — declared per rule, see relevance.ts
  readonly plausibilityBasis: string;
  readonly confidence: number;
  readonly formula: string;
  readonly assumptions: readonly string[];
  /** How the assessment would change the property's inputs if it were real: used by the relevance engine to re-run the decision. */
  readonly perturbation: Partial<Perturbation> | null;
  readonly evidence: readonly string[];
}

/** Adjustments a signal can make to the decision inputs (all multiplicative unless stated). */
export interface Perturbation {
  readonly sessionsFactor: number;      // demand
  readonly convFactor: number;          // conversion (mobile and desktop)
  readonly otaShareDelta: number;       // additive
  readonly adrFactor: number;
  readonly peakOccupancyDelta: number;  // additive, capacity
  readonly commissionDelta: number;     // additive
  readonly lowSeasonOccDelta: number;   // additive
}

// ---- Domain inputs (what connectors deliver) ---------------------------------------------------------------

export interface WeatherDay { readonly date: string; readonly precipitationMm: number; readonly tMaxC: number; readonly tMinC: number; readonly windMaxKmh: number; readonly sunshineHours: number | null }
export interface WeatherForecast { readonly location: { readonly name: string; readonly lat: number; readonly lon: number }; readonly issuedAt: string; readonly days: readonly WeatherDay[]; readonly provider: string; readonly modelNote: string }

export interface Holiday { readonly date: string; readonly name: string; readonly region: string; readonly source: string }

export interface EventRecord {
  readonly id: string; readonly name: string; readonly start: string; readonly end: string;
  readonly expectedAttendance: number | null; readonly distanceKm: number | null; readonly venue: string;
  readonly category: string; readonly source: string; readonly enteredBy: "operator" | "provider" | "simulation"; readonly evidenceNote: string;
}

export interface SearchSeries { readonly term: string; readonly geography: string; readonly kind: "branded" | "non_branded" | "destination"; readonly weekly: readonly { readonly week: string; readonly index: number }[]; readonly source: string }

export interface MacroIndicator { readonly id: string; readonly name: string; readonly value: number; readonly unit: string; readonly geography: string; readonly asOf: string; readonly frequency: Freshness; readonly source: string; readonly status: Status }

export interface CompetitorObservation { readonly competitorId: string; readonly name: string; readonly observedAt: string; readonly date: string; readonly rateGbp: number | null; readonly available: boolean | null; readonly reviewScore: number | null; readonly reviewCount30d: number | null; readonly source: string; readonly enteredBy: "operator" | "provider" | "simulation" }

export interface OtaSnapshot { readonly asOf: string; readonly channels: readonly { readonly name: string; readonly share: number; readonly commission: number; readonly rankingPosition: number | null; readonly cancellationRate: number | null; readonly bookingWindowDays: number | null }[]; readonly shareTrend12m: number; readonly source: string }

export interface OperationsSnapshot {
  readonly asOf: string; readonly roomsInService: number; readonly roomsOutOfOrder: number; readonly peakOccupancy: number; readonly peakPeriod: string;
  readonly staffingCoverage: number; readonly serviceSlotsPerDay: number | null; readonly slotUtilisation: number | null; readonly openingHoursPerWeek: number;
  readonly noShowRate: number; readonly cancellationRate: number; readonly waitlistCount: number; readonly source: string;
}

/** Camera abstraction. No identity, no faces, no tracking fields exist on purpose (see COMPUTER_VISION_GOVERNANCE.md). */
export interface CameraSource { readonly id: string; readonly zone: string; readonly purpose: "queue" | "occupancy" | "table_occupancy" | "parking" | "capacity_utilisation"; readonly configured: boolean; readonly streamUrlEnv: string; readonly retentionHours: number; readonly legalBasis: string }
export interface VisionObservation { readonly cameraId: string; readonly zone: string; readonly metric: "queue_length" | "occupancy_estimate" | "tables_occupied" | "vehicles"; readonly value: number; readonly confidence: number; readonly sampledAt: string; readonly modelId: string; readonly frameRetained: false }

export interface ExternalContext {
  readonly fetchedAt: string;
  readonly connectors: readonly ConnectorContract[];
  readonly sourceQuality: Readonly<Record<string, DataQuality>>;   // by property source id (SRC-…) and connector id
  readonly weather: WeatherForecast | null;
  readonly holidays: readonly Holiday[];
  readonly events: readonly EventRecord[];
  readonly search: readonly SearchSeries[];
  readonly macro: readonly MacroIndicator[];
  readonly competitors: readonly CompetitorObservation[];
  readonly ota: OtaSnapshot | null;
  readonly operations: OperationsSnapshot | null;
  readonly cameras: readonly CameraSource[];
  readonly vision: readonly VisionObservation[];
}

export const emptyContext = (fetchedAt: string, connectors: readonly ConnectorContract[] = []): ExternalContext => ({
  fetchedAt, connectors, sourceQuality: {}, weather: null, holidays: [], events: [], search: [], macro: [], competitors: [], ota: null, operations: null, cameras: [], vision: [],
});
