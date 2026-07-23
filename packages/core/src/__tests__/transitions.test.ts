import { describe, expect, it } from "vitest";
import { assertTransition, canTransition, terminalStates } from "../state-machine.js";
import { PROPERTY_TRANSITIONS } from "../property.js";
import { TASK_TRANSITIONS } from "../task.js";
import { AGENT_RUN_TRANSITIONS } from "../agent-run.js";
import { MANDATE_TRANSITIONS } from "../mandate.js";

describe("cycle de vie Property", () => {
  it("suit le chemin prospect → assessed → qualified → underwriting → mandate", () => {
    expect(canTransition(PROPERTY_TRANSITIONS, "prospect", "assessed")).toBe(true);
    expect(canTransition(PROPERTY_TRANSITIONS, "underwriting", "mandate")).toBe(true);
  });

  it("interdit les sauts (prospect → mandate)", () => {
    expect(canTransition(PROPERTY_TRANSITIONS, "prospect", "mandate")).toBe(false);
    expect(() => assertTransition("Property", PROPERTY_TRANSITIONS, "prospect", "mandate")).toThrow(
      /transition interdite/,
    );
  });

  it("permet la réanimation d'un dossier (declined/dormant → prospect)", () => {
    expect(canTransition(PROPERTY_TRANSITIONS, "declined", "prospect")).toBe(true);
    expect(canTransition(PROPERTY_TRANSITIONS, "dormant", "prospect")).toBe(true);
  });
});

describe("cycle de vie Task", () => {
  it("bloque puis reprend", () => {
    expect(canTransition(TASK_TRANSITIONS, "in_progress", "blocked")).toBe(true);
    expect(canTransition(TASK_TRANSITIONS, "blocked", "in_progress")).toBe(true);
  });

  it("completed et cancelled sont terminaux", () => {
    expect(terminalStates(TASK_TRANSITIONS).sort()).toEqual(["cancelled", "completed"]);
  });
});

describe("cycle de vie AgentRun (arrêt d'urgence)", () => {
  it("un run en retenue T2 peut être ANNULÉ (arrêt d'urgence), pas seulement repris", () => {
    expect(canTransition(AGENT_RUN_TRANSITIONS, "sleeping_retention", "cancelled")).toBe(true);
    expect(canTransition(AGENT_RUN_TRANSITIONS, "sleeping_retention", "started")).toBe(true);
  });

  it("un run en attente d'approbation peut être annulé", () => {
    expect(canTransition(AGENT_RUN_TRANSITIONS, "awaiting_approval", "cancelled")).toBe(true);
  });
});

describe("cycle de vie Mandate", () => {
  it("active ↔ suspended, et terminaux", () => {
    expect(canTransition(MANDATE_TRANSITIONS, "active", "suspended")).toBe(true);
    expect(canTransition(MANDATE_TRANSITIONS, "suspended", "active")).toBe(true);
    expect(terminalStates(MANDATE_TRANSITIONS).sort()).toEqual(["completed", "terminated"]);
  });
});
