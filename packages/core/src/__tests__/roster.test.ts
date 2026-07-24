import { describe, expect, it } from "vitest";
import { AGENT_IDS, ROSTER } from "../agent.js";

describe("roster canonique (12 agents métier)", () => {
  it("compte exactement 12 agents (planner n'est PAS un agent métier)", () => {
    expect(AGENT_IDS).toHaveLength(12);
    expect(AGENT_IDS).not.toContain("planner"); // utilitaire système, hors roster
  });

  it("affecte les niveaux d'autonomie par défaut du §7", () => {
    expect(ROSTER.analyst.defaultTier).toBe("T0");
    expect(ROSTER.underwriter.defaultTier).toBe("T0");
    expect(ROSTER.orchestrator.defaultTier).toBe("T0");
    expect(ROSTER["social-ops"].defaultTier).toBe("T1");
    expect(ROSTER.conversion.defaultTier).toBe("T1");
    expect(ROSTER.reputation.defaultTier).toBe("T2");
    expect(ROSTER.partnerships.defaultTier).toBe("T2");
    expect(ROSTER.lifecycle.defaultTier).toBe("T3");
    expect(ROSTER["media-buyer"].defaultTier).toBe("T4");
    expect(ROSTER["rate-distribution"].defaultTier).toBe("T4");
    expect(ROSTER["content-creator"].defaultTier).toBe("T5");
    // Directrice Artistique — même régime T5 (touche à la voix de marque), distincte de content-creator.
    expect(ROSTER["art-director"].defaultTier).toBe("T5");
  });

  it("les libellés de rôle sont en anglais britannique", () => {
    expect(ROSTER["rate-distribution"].role).toBe("Rate & Distribution");
    expect(ROSTER["content-creator"].role).toBe("Content Creator");
    expect(ROSTER["art-director"].role).toBe("Art Director");
  });
});
