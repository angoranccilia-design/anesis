/** Chantier D — a status is CONNECTED only after a successful call in the same run; a failure yields DATA_UNAVAILABLE and no value. Canned responses are SYNTHETIC fixtures. */
import { describe, it, expect, afterEach } from "vitest";
import { buildContext, verifyConnectors, setConnectorFetch, mapsConnector } from "@anesis/connectors";
import { COUNTRY_HOUSE_34 } from "@anesis/engine";

const res = (body: string, ok = true, status = 200) => ({ ok, status, json: async () => JSON.parse(body), text: async () => body }) as unknown as Response;
afterEach(() => setConnectorFetch(null));

describe("D — connector statuses are earned, never declared", () => {
  it("every live call failing: five DATA_UNAVAILABLE with the cause, no weather, no holidays, no macro value; maps is OPERATOR_ENTERED, never CONNECTED", async () => {
    setConnectorFetch(async () => { throw new Error("network down"); });
    const ctx = await buildContext(COUNTRY_HOUSE_34);
    const by = Object.fromEntries(ctx.connectors.map((c) => [c.id, c]));
    for (const id of ["CONN-WEATHER", "CONN-CALENDAR", "CONN-FX", "CONN-INFLATION", "CONN-BANK-RATE"]) { expect(by[id]!.status).toBe("DATA_UNAVAILABLE"); expect(by[id]!.statusNote).toMatch(/network down.*no value is fabricated/); }
    expect(ctx.weather).toBeNull(); expect(ctx.holidays).toEqual([]); expect(ctx.macro).toEqual([]);
    expect(by["CONN-MAPS"]!.status).toBe("OPERATOR_ENTERED"); expect(by["CONN-MAPS"]!.kind).toBe("operator"); expect(mapsConnector(COUNTRY_HOUSE_34).statusNote).toMatch(/no geocoding call is made/);
    expect(ctx.connectors.filter((c) => c.status === "CONNECTED")).toHaveLength(0);
  });
  it("canned responses: ONS observations are unsorted and the latest month wins; the Bank of England CSV's last row is the rate; an HTML page instead of CSV is a failure", async () => {
    setConnectorFetch(async (input) => {
      const url = String(input);
      if (url.endsWith("/editions/time-series")) return res(JSON.stringify({ links: { latest_version: { href: "https://api.beta.ons.gov.uk/v1/datasets/cpih01/editions/time-series/versions/67", id: "67" } } }));
      if (url.includes("ons.gov.uk")) return res(JSON.stringify({ observations: [{ observation: "52.1", dimensions: { Time: { id: "Nov-89" } } }, { observation: "137.9", dimensions: { Time: { id: "Aug-26" } } }, { observation: "100.1", dimensions: { Time: { id: "May-15" } } }, { observation: "x", dimensions: { Time: { id: "Sep-26" } } }] }));
      if (url.includes("bankofengland")) return res("DATE,IUDBEDR\n02 Jan 2026,3.75\n05 Jan 2026,3.75\n19 Sep 2026,3.50\n");
      if (url.includes("frankfurter")) return res(JSON.stringify({ date: "2026-10-14", rates: { EUR: 1.18, USD: 1.33 } }));
      if (url.includes("gov.uk")) return res(JSON.stringify({ "england-and-wales": { events: [{ date: "2026-12-25", title: "Christmas Day" }] } }));
      if (url.includes("open-meteo")) return res(JSON.stringify({ daily: { time: ["2026-10-14"], precipitation_sum: [0], temperature_2m_max: [17], temperature_2m_min: [8], wind_speed_10m_max: [20], sunshine_duration: [3600] } }));
      return res("", false, 404);
    });
    const ctx = await buildContext(COUNTRY_HOUSE_34);
    const cpi = ctx.macro.find((m) => m.id === "macro.cpih")!; expect(cpi.value).toBe(137.9); expect(cpi.asOf).toBe("2026-08-01T00:00:00Z");   // "Sep-26" was unreadable and skipped
    const br = ctx.macro.find((m) => m.id === "macro.bank_rate")!; expect(br.value).toBe(3.5); expect(br.asOf.slice(0, 10)).toBe("2026-09-19");
    expect(ctx.connectors.filter((c) => c.status === "CONNECTED").map((c) => c.id).sort()).toEqual(["CONN-BANK-RATE", "CONN-CALENDAR", "CONN-FX", "CONN-INFLATION", "CONN-WEATHER"]);
    setConnectorFetch(async (input) => (String(input).includes("bankofengland") ? res("<html><body>consent</body></html>") : res("", false, 500)));
    const v = await verifyConnectors(COUNTRY_HOUSE_34);
    expect(v.find((x) => x.id === "CONN-BANK-RATE")!.status).toBe("DATA_UNAVAILABLE"); expect(v.find((x) => x.id === "CONN-BANK-RATE")!.note).toMatch(/HTML page/);
    expect(v.every((x) => x.status !== "CONNECTED")).toBe(true);
  });
});
