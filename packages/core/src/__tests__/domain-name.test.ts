import { describe, expect, it } from "vitest";
import { normalizeDomain } from "../domain-name.js";

describe("normalizeDomain (clé de déduplication)", () => {
  it("retire protocole, www, chemin et met en minuscules", () => {
    expect(normalizeDomain("https://www.TheOldRectory.co.uk/rooms?ref=x")).toBe("theoldrectory.co.uk");
    expect(normalizeDomain("http://foxandhound.com")).toBe("foxandhound.com");
    expect(normalizeDomain("Example.CO.UK:443/")).toBe("example.co.uk");
  });

  it("deux formes du même site donnent la même clé", () => {
    expect(normalizeDomain("https://www.safirhammam.com")).toBe(normalizeDomain("safirhammam.com/#book"));
  });

  it("renvoie null pour une entrée vide ou absente", () => {
    expect(normalizeDomain("")).toBeNull();
    expect(normalizeDomain(null)).toBeNull();
    expect(normalizeDomain(undefined)).toBeNull();
  });
});
