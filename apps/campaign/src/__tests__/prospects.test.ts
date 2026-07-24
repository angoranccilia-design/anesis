import { describe, expect, it } from "vitest";
import { formatFromPath, parseProspects } from "../prospects.js";

describe("parseProspects — lecture CSV/JSON des prospects de campagne", () => {
  it("lit un CSV avec en-têtes, guillemets et virgules échappées", () => {
    const csv = [
      "name,website,region,source,priority",
      'The Old Rectory,https://oldrectory.co.uk,South West,campaign-2026-08,5',
      '"Smith, Jones & Co Hotel",https://sjc.co.uk,London,campaign-2026-08,',
    ].join("\n");
    const rows = parseProspects(csv, "csv");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({
      name: "The Old Rectory",
      website: "https://oldrectory.co.uk",
      region: "South West",
      source: "campaign-2026-08",
      city: undefined,
      county: undefined,
      priority: 5,
    });
    expect(rows[1]?.name).toBe("Smith, Jones & Co Hotel"); // virgule dans le champ entre guillemets
    expect(rows[1]?.priority).toBeUndefined();
  });

  it("lit un JSON tableau d'objets", () => {
    const json = JSON.stringify([{ name: "Coastal House", region: "South West", source: "c" }]);
    const rows = parseProspects(json, "json");
    expect(rows).toHaveLength(1);
    expect(rows[0]?.name).toBe("Coastal House");
  });

  it("rejette une ligne sans champ requis", () => {
    const csv = "name,region\nNo Source Inn,South West";
    expect(() => parseProspects(csv, "csv")).toThrow(/requis/);
  });

  it("déduit le format depuis l'extension", () => {
    expect(formatFromPath("prospects.json")).toBe("json");
    expect(formatFromPath("prospects.csv")).toBe("csv");
    expect(formatFromPath("list.CSV")).toBe("csv");
  });
});
