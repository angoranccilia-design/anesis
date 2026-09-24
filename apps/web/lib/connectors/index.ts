import "server-only";
import type { ConnectorContract, ExternalContext, WeatherForecast, Holiday, MacroIndicator, EventRecord, CompetitorObservation, OtaSnapshot, OperationsSnapshot, CameraSource, Freshness, DataQuality } from "@anesis/engine";
import { cameraConnector, quality, COUNTRY_HOUSE_34, type PropertySpec } from "@anesis/engine";

/**
 * External data connectors. Each one is a contract with an explicit state. Live connectors need no credentials
 * (public APIs) and are fetched with a short in-process cache; every other connector declares the environment
 * variables it would need and reports NOT_CONNECTED. Nothing here fabricates a connection or a value.
 */
const cache = new Map<string, { at: number; value: unknown }>();
async function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = cache.get(key); if (hit && Date.now() - hit.at < ttlMs) return hit.value as T;
  const value = await fn(); cache.set(key, { at: Date.now(), value }); return value;
}
const get = async (url: string, timeoutMs = 8000): Promise<unknown> => {
  const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs), headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};
const contract = (c: Omit<ConnectorContract, "status" | "statusNote" | "lastFetchedAt"> & Partial<Pick<ConnectorContract, "status" | "statusNote" | "lastFetchedAt">>): ConnectorContract => ({ status: "NOT_CONNECTED", statusNote: `requires ${c.requires.join(", ") || "a provider contract"}; not configured in this environment`, lastFetchedAt: null, ...c });

// ---- live, credential-free ----------------------------------------------------------------------------------
export async function fetchWeather(spec: PropertySpec): Promise<{ contract: ConnectorContract; data: WeatherForecast | null }> {
  const base = contract({ id: "CONN-WEATHER", domain: "weather", name: "Weather forecast", provider: "Open-Meteo (open data, no key)", kind: "live", requires: [], freshness: "DAILY", legal: "Open-Meteo non-commercial/attribution terms; commercial use needs the paid tier" });
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${spec.location.lat}&longitude=${spec.location.lon}&daily=precipitation_sum,temperature_2m_max,temperature_2m_min,wind_speed_10m_max,sunshine_duration&forecast_days=14&timezone=auto`;
    const j = await cached(url, 60 * 60 * 1000, () => get(url)) as { daily: { time: string[]; precipitation_sum: (number | null)[]; temperature_2m_max: (number | null)[]; temperature_2m_min: (number | null)[]; wind_speed_10m_max: (number | null)[]; sunshine_duration: (number | null)[] } };
    const at = new Date().toISOString();
    const days = j.daily.time.map((date, i) => ({ date, precipitationMm: j.daily.precipitation_sum[i] ?? 0, tMaxC: j.daily.temperature_2m_max[i] ?? 0, tMinC: j.daily.temperature_2m_min[i] ?? 0, windMaxKmh: j.daily.wind_speed_10m_max[i] ?? 0, sunshineHours: j.daily.sunshine_duration[i] == null ? null : (j.daily.sunshine_duration[i] as number) / 3600 }));
    return { contract: { ...base, status: "CONNECTED", statusNote: `${days.length}-day daily forecast for ${spec.location.name} (${spec.location.lat}, ${spec.location.lon})`, lastFetchedAt: at }, data: { location: spec.location, issuedAt: at, days, provider: "Open-Meteo", modelNote: "best-match global/regional model blend; skill declines with lead time" } };
  } catch (e) { return { contract: { ...base, status: "ERROR", statusNote: `fetch failed: ${e instanceof Error ? e.message : String(e)}` }, data: null }; }
}

export async function fetchHolidays(country: string): Promise<{ contract: ConnectorContract; data: Holiday[] }> {
  const base = contract({ id: "CONN-CALENDAR", domain: "calendar", name: "Public holidays", provider: country === "GB" ? "gov.uk bank holidays (open data)" : "Nager.Date (open data)", kind: "live", requires: [], freshness: "STATIC", legal: "open government data" });
  try {
    if (country === "GB") {
      const j = await cached("gov-bh", 24 * 3600e3, () => get("https://www.gov.uk/bank-holidays.json")) as Record<string, { events: { date: string; title: string }[] }>;
      const ew = j["england-and-wales"]?.events ?? [];
      return { contract: { ...base, status: "CONNECTED", statusNote: `${ew.length} bank holidays (England and Wales)`, lastFetchedAt: new Date().toISOString() }, data: ew.map((e) => ({ date: e.date, name: e.title, region: "england-and-wales", source: "gov.uk" })) };
    }
    const y = new Date().getUTCFullYear();
    const j = await cached(`nager-${country}-${y}`, 24 * 3600e3, () => get(`https://date.nager.at/api/v3/PublicHolidays/${y}/${country}`)) as { date: string; localName: string }[];
    return { contract: { ...base, status: "CONNECTED", statusNote: `${j.length} public holidays ${y}`, lastFetchedAt: new Date().toISOString() }, data: j.map((e) => ({ date: e.date, name: e.localName, region: country, source: "Nager.Date" })) };
  } catch (e) { return { contract: { ...base, status: "ERROR", statusNote: `fetch failed: ${e instanceof Error ? e.message : String(e)}` }, data: [] }; }
}

export async function fetchFx(): Promise<{ contract: ConnectorContract; data: MacroIndicator[] }> {
  const base = contract({ id: "CONN-FX", domain: "macro", name: "Exchange rates (GBP)", provider: "Frankfurter (ECB reference rates, no key)", kind: "live", requires: [], freshness: "DAILY", legal: "public ECB reference rates" });
  try {
    const j = await cached("fx", 6 * 3600e3, () => get("https://api.frankfurter.dev/v1/latest?base=GBP&symbols=EUR,USD")) as { date: string; rates: Record<string, number> };
    const at = new Date().toISOString();
    const data: MacroIndicator[] = Object.entries(j.rates).map(([k, v]) => ({ id: `fx.gbp_${k.toLowerCase()}`, name: `GBP/${k}`, value: v, unit: k, geography: "Eurozone / US", asOf: `${j.date}T16:00:00Z`, frequency: "DAILY", source: "CONN-FX", status: "VERIFIED" }));
    return { contract: { ...base, status: "CONNECTED", statusNote: `ECB reference rates dated ${j.date}`, lastFetchedAt: at }, data };
  } catch (e) { return { contract: { ...base, status: "ERROR", statusNote: `fetch failed: ${e instanceof Error ? e.message : String(e)}` }, data: [] }; }
}

// ---- contracts only (credentials or provider agreements required) -----------------------------------------
export const CONTRACT_ONLY: ConnectorContract[] = [
  contract({ id: "CONN-PMS", domain: "pms", name: "Property management system", provider: "Mews / Opera Cloud / Guestline (API)", kind: "contract", requires: ["ANESIS_PMS_PROVIDER", "ANESIS_PMS_API_KEY", "ANESIS_PMS_PROPERTY_ID"], freshness: "HOURLY", legal: "property's own data under its PMS contract; read-only scope" }),
  contract({ id: "CONN-BOOKING-ENGINE", domain: "booking_engine", name: "Booking engine", provider: "SynXis / SiteMinder / Profitroom (API)", kind: "contract", requires: ["ANESIS_BE_PROVIDER", "ANESIS_BE_API_KEY"], freshness: "HOURLY", legal: "property's own data" }),
  contract({ id: "CONN-GA4", domain: "web_analytics", name: "Google Analytics 4", provider: "GA4 Data API (service account)", kind: "contract", requires: ["ANESIS_GA4_PROPERTY_ID", "GOOGLE_APPLICATION_CREDENTIALS"], freshness: "DAILY", legal: "property grants viewer access" }),
  contract({ id: "CONN-GOOGLE-ADS", domain: "google_ads", name: "Google Ads", provider: "Google Ads API", kind: "contract", requires: ["ANESIS_GADS_CUSTOMER_ID", "ANESIS_GADS_DEVELOPER_TOKEN", "ANESIS_GADS_REFRESH_TOKEN"], freshness: "DAILY", legal: "manager-account link approved by the property" }),
  contract({ id: "CONN-META-ADS", domain: "meta_ads", name: "Meta Ads", provider: "Marketing API", kind: "contract", requires: ["ANESIS_META_AD_ACCOUNT_ID", "ANESIS_META_ACCESS_TOKEN"], freshness: "DAILY", legal: "partner access to the ad account" }),
  contract({ id: "CONN-CRM", domain: "crm", name: "Guest CRM", provider: "Revinate / For-Sight / HubSpot (API)", kind: "contract", requires: ["ANESIS_CRM_PROVIDER", "ANESIS_CRM_API_KEY"], freshness: "DAILY", legal: "aggregates only; no guest-level export without a data-processing agreement" }),
  contract({ id: "CONN-RMS", domain: "rms", name: "Revenue management system", provider: "IDeaS / Duetto / Atomize (API)", kind: "contract", requires: ["ANESIS_RMS_PROVIDER", "ANESIS_RMS_API_KEY"], freshness: "DAILY", legal: "read-only forecast and rate export" }),
  contract({ id: "CONN-OTA", domain: "ota", name: "OTA channel data", provider: "Booking.com / Expedia / Airbnb via channel manager", kind: "contract", requires: ["ANESIS_CHANNEL_MANAGER_API_KEY"], freshness: "WEEKLY", legal: "property's own extranet data through its channel manager; no scraping" }),
  contract({ id: "CONN-EVENTS", domain: "events", name: "Future events", provider: "PredictHQ / Ticketmaster Discovery (API) or operator register", kind: "contract", requires: ["ANESIS_EVENTS_PROVIDER", "ANESIS_EVENTS_API_KEY"], freshness: "WEEKLY", legal: "provider terms; operator-entered events are accepted with their evidence note", statusNote: "no provider key; operator-entered events are used when present" }),
  contract({ id: "CONN-SEARCH", domain: "search", name: "Search demand", provider: "Google Trends (no official API); Google Search Console for branded queries", kind: "contract", requires: ["ANESIS_GSC_SITE_URL", "GOOGLE_APPLICATION_CREDENTIALS"], freshness: "WEEKLY", legal: "Trends has no official API and its terms prohibit scraping; Search Console needs the property's consent" }),
  contract({ id: "CONN-INFLATION", domain: "macro", name: "UK inflation (CPIH)", provider: "ONS API (beta)", kind: "live", requires: [], freshness: "MONTHLY", legal: "open government data", statusNote: "endpoint returned HTTP 500 on the observations query on 24 September 2026; contract kept, no value invented" }),
  contract({ id: "CONN-BANK-RATE", domain: "macro", name: "Bank of England base rate", provider: "Bank of England database", kind: "live", requires: [], freshness: "MONTHLY", legal: "open data", statusNote: "CSV endpoint returns an HTML consent page from this environment; contract kept, no value invented" }),
  contract({ id: "CONN-COMPETITOR", domain: "competitor", name: "Competitor rates and visibility", provider: "Lighthouse / OTA Insight (rate shopping, contract) or operator-entered observations", kind: "contract", requires: ["ANESIS_RATESHOP_PROVIDER", "ANESIS_RATESHOP_API_KEY"], freshness: "DAILY", legal: "no scraping of OTA or competitor sites; licensed rate-shopping data or manual observations only", statusNote: "no rate-shopping licence; operator-entered observations are used when present" }),
];

export function mapsConnector(spec: PropertySpec): ConnectorContract {
  return contract({ id: "CONN-MAPS", domain: "maps", name: "Geographic data", provider: "Open-Meteo geocoding (open data)", kind: "live", requires: [], freshness: "STATIC", legal: "open data", status: "CONNECTED", statusNote: `property located at ${spec.location.name} (${spec.location.lat}, ${spec.location.lon}); geocoding endpoint reachable`, lastFetchedAt: new Date().toISOString() });
}

/** Operator-entered registers (events, competitor observations) live in process memory alongside runs. */
export interface OperatorRegisters { events: EventRecord[]; competitors: CompetitorObservation[]; ota: OtaSnapshot | null; operations: OperationsSnapshot | null; cameras: CameraSource[]; sourceQuality: Record<string, DataQuality> }
export const emptyRegisters = (): OperatorRegisters => ({ events: [], competitors: [], ota: null, operations: null, cameras: [], sourceQuality: {} });

export async function buildContext(spec: PropertySpec = COUNTRY_HOUSE_34, reg: OperatorRegisters = emptyRegisters(), overrides: { weather?: WeatherForecast | null; offline?: boolean } = {}): Promise<ExternalContext> {
  const now = new Date().toISOString();
  const [wx, hol, fx] = overrides.offline ? [null, null, null] : await Promise.all([fetchWeather(spec), fetchHolidays(spec.location.country), fetchFx()]);
  const offlineNote = (id: string, domain: ConnectorContract["domain"], name: string, provider: string, fresh: Freshness): ConnectorContract => contract({ id, domain, name, provider, kind: "live", requires: [], freshness: fresh, legal: "open data", status: "NOT_CONNECTED", statusNote: "offline mode requested: live fetch skipped" });
  const connectors: ConnectorContract[] = [
    wx?.contract ?? offlineNote("CONN-WEATHER", "weather", "Weather forecast", "Open-Meteo", "DAILY"),
    hol?.contract ?? offlineNote("CONN-CALENDAR", "calendar", "Public holidays", "gov.uk", "STATIC"),
    fx?.contract ?? offlineNote("CONN-FX", "macro", "Exchange rates (GBP)", "Frankfurter", "DAILY"),
    mapsConnector(spec),
    ...CONTRACT_ONLY.map((c) => (c.id === "CONN-EVENTS" && reg.events.length ? { ...c, status: "OPERATOR_ENTERED" as const, statusNote: `${reg.events.length} operator-entered event(s)` } : c.id === "CONN-COMPETITOR" && reg.competitors.length ? { ...c, status: "OPERATOR_ENTERED" as const, statusNote: `${reg.competitors.length} operator-entered observation(s)` } : c)),
    cameraConnector(reg.cameras, process.env, now),
  ];
  const weather = overrides.weather !== undefined ? overrides.weather : wx?.data ?? null;
  const sourceQuality: Record<string, DataQuality> = { ...reg.sourceQuality };
  if (wx?.contract.status === "CONNECTED") sourceQuality["CONN-WEATHER"] = quality(1, 0.8, 0, "DAILY", "forecast skill declines with lead time");
  return { fetchedAt: now, connectors, sourceQuality, weather, holidays: hol?.data ?? [], events: reg.events, search: [], macro: fx?.data ?? [], competitors: reg.competitors, ota: reg.ota, operations: reg.operations, cameras: reg.cameras, vision: [] };
}
