/**
 * CAPACITY CONSTRAINT ENGINE — capacity is a network, not a room count.
 * Property → capacity nodes (rooms, spa, restaurant, experience, outdoor) → resources (rooms, housekeeping, treatment rooms,
 * therapists, slots, opening hours, tables, kitchen, guides, vehicles, equipment, units, cleaning) → dependencies →
 * utilisation → bottleneck. A node's attainable capacity is its nominal capacity scaled by the weakest resource it depends
 * on: nominal capacity ≠ attainable capacity. Every resource carries source, timestamp and confidence.
 */
import type { VisionObservation } from "./types.js";

export type ResourceType = "rooms" | "housekeeping" | "reception" | "maintenance" | "treatment_rooms" | "therapists" | "treatment_slots" | "opening_hours" | "tables" | "covers" | "kitchen" | "service_staff" | "guides" | "vehicles" | "equipment" | "time_slots" | "units" | "cleaning" | "participant_limit";
export type NodeActivity = "rooms" | "spa" | "restaurant" | "experience" | "outdoor";

export interface CapacityResource {
  readonly id: string; readonly propertyId: string; readonly type: ResourceType; readonly resource: string; readonly unit: string;
  readonly maximumCapacity: number; readonly availableCapacity: number; readonly utilizedCapacity: number;
  readonly timeWindow: string; readonly operatingHours: number | null;
  readonly staffDependency: readonly string[]; readonly equipmentDependency: readonly string[]; readonly weatherDependency: boolean;
  readonly source: string; readonly timestamp: string; readonly confidence: number;
}
export interface CapacityNode { readonly id: string; readonly name: string; readonly activity: NodeActivity; readonly primaryResource: string; readonly requires: readonly string[]; readonly revenueShare: number | null }
export interface CapacityGraph { readonly nodes: readonly CapacityNode[]; readonly resources: readonly CapacityResource[] }

export interface NodeAssessment {
  readonly nodeId: string; readonly name: string; readonly activity: NodeActivity;
  readonly demandRelevance: number;      // share of property-wide acquisition that lands on this node (declared per property type or revenue share)
  readonly nominalCapacity: number; readonly attainableCapacity: number; readonly attainableRatio: number;
  readonly utilizedCapacity: number; readonly utilisationOfAttainable: number;
  readonly bottleneck: { readonly resourceId: string; readonly resource: string; readonly availabilityRatio: number } | null;
  readonly resourceRatios: readonly { readonly resourceId: string; readonly resource: string; readonly ratio: number; readonly weatherSensitive: boolean }[];
  readonly queue: { readonly meanLength: number; readonly estimatedWaitMinutes: number; readonly samples: number } | null;
  readonly binds: boolean; readonly confidence: number; readonly explanation: string; readonly formula: string; readonly timestamp: string;
}

export const NODE_BIND_UTILISATION = 0.92;   // declared: a node binds when utilisation of ATTAINABLE capacity ≥ 92 %
export const QUEUE_SERVICE_MINUTES = 3;      // declared: minutes of reception service per person in a queue (wait estimate)
export const QUEUE_BIND_MINUTES = 15;        // declared: a recurring estimated wait ≥ 15 min indicates a service bottleneck

const ratioOf = (r: CapacityResource, weatherPoor: boolean): number => { const base = r.maximumCapacity > 0 ? r.availableCapacity / r.maximumCapacity : 0; return r.weatherDependency && weatherPoor ? base * 0.5 : Math.min(1, base); };

/** Resolves each node against its dependency graph (transitively through staff and equipment dependencies). */
/** Declared: how much of property-wide acquisition lands on each activity, by property type, unless a node states its revenue share. */
export const DEMAND_RELEVANCE: Record<string, Partial<Record<NodeActivity, number>>> = {
  hotel: { rooms: 1, spa: 0.2, restaurant: 0.15, experience: 0.1, outdoor: 0 }, country_house: { rooms: 1, spa: 0.25, restaurant: 0.2, experience: 0.1, outdoor: 0 }, resort: { rooms: 1, spa: 0.3, restaurant: 0.2, experience: 0.2, outdoor: 0.2 },
  spa: { rooms: 1, spa: 0.7, restaurant: 0.2, experience: 0.1, outdoor: 0 }, wellness_retreat: { rooms: 1, spa: 0.8, restaurant: 0.2, experience: 0.3, outdoor: 0 }, glamping: { rooms: 0, spa: 0, restaurant: 0.1, experience: 0.3, outdoor: 1 }, ecolodge: { rooms: 0.5, spa: 0, restaurant: 0.1, experience: 0.4, outdoor: 1 },
};
export const CHAIN_RELEVANCE = 0.3;          // declared: a node enters the acquisition chain when ≥ 30 % of acquired demand lands on it

export function assessCapacity(graph: CapacityGraph, opts: { weatherPoor?: boolean; vision?: readonly VisionObservation[]; nowIso: string; propertyType?: string } ): NodeAssessment[] {
  const byId = new Map(graph.resources.map((r) => [r.id, r]));
  const closure = (ids: readonly string[]): string[] => { const seen = new Set<string>(); const stack = [...ids]; while (stack.length) { const id = stack.pop()!; if (seen.has(id)) continue; const r = byId.get(id); if (!r) continue; seen.add(id); stack.push(...r.staffDependency, ...r.equipmentDependency); } return [...seen]; };
  return graph.nodes.map((n) => {
    const primary = byId.get(n.primaryResource);
    const deps = closure([n.primaryResource, ...n.requires]).map((id) => byId.get(id)!).filter(Boolean);
    const ratios = deps.map((r) => ({ resourceId: r.id, resource: r.resource, ratio: ratioOf(r, opts.weatherPoor ?? false), weatherSensitive: r.weatherDependency }));
    const weakest = ratios.reduce<typeof ratios[number] | null>((a, x) => (a === null || x.ratio < a.ratio ? x : a), null);
    const nominal = primary?.maximumCapacity ?? 0;
    const attainableRatio = weakest ? weakest.ratio : 1;
    const attainable = nominal * attainableRatio;
    const utilised = primary?.utilizedCapacity ?? 0;
    const util = attainable > 0 ? utilised / attainable : 0;
    const q = (opts.vision ?? []).filter((v) => v.metric === "queue_length" && v.zone.toLowerCase().includes(n.activity === "rooms" ? "reception" : n.activity));
    const queue = q.length ? { meanLength: q.reduce((a, v) => a + v.value, 0) / q.length, estimatedWaitMinutes: (q.reduce((a, v) => a + v.value, 0) / q.length) * QUEUE_SERVICE_MINUTES, samples: q.length } : null;
    const binds = util >= NODE_BIND_UTILISATION || (queue !== null && queue.estimatedWaitMinutes >= QUEUE_BIND_MINUTES);
    const conf = deps.length ? Math.min(...deps.map((d) => d.confidence)) : 0;
    const explanation = `${n.name}: nominal ${nominal} ${primary?.unit ?? ""}; attainable ${attainable.toFixed(1)} (${(attainableRatio * 100).toFixed(0)} %) — weakest dependency ${weakest ? `${weakest.resource} at ${(weakest.ratio * 100).toFixed(0)} %` : "none"}; utilised ${utilised} = ${(util * 100).toFixed(0)} % of attainable${queue ? `; camera: mean queue ${queue.meanLength.toFixed(1)} ≈ ${queue.estimatedWaitMinutes.toFixed(0)} min wait (${queue.samples} samples)` : ""}${binds ? " → BINDS" : ""}`;
    const demandRelevance = n.revenueShare ?? DEMAND_RELEVANCE[opts.propertyType ?? "hotel"]?.[n.activity] ?? 0.2;
    return { nodeId: n.id, name: n.name, activity: n.activity, demandRelevance, nominalCapacity: nominal, attainableCapacity: attainable, attainableRatio, utilizedCapacity: utilised, utilisationOfAttainable: util, bottleneck: weakest ? { resourceId: weakest.resourceId, resource: weakest.resource, availabilityRatio: weakest.ratio } : null, resourceRatios: ratios, queue, binds, confidence: conf, explanation, formula: `attainable = nominal × min(available ÷ maximum over dependencies${opts.weatherPoor ? ", × 0.5 for weather-dependent resources under poor weather" : ""}); utilisation = utilised ÷ attainable; binds at ≥ ${NODE_BIND_UTILISATION} or estimated wait ≥ ${QUEUE_BIND_MINUTES} min`, timestamp: opts.nowIso };
  });
}

/** Builds the default graph for a property from what is known: rooms + housekeeping (+ spa / restaurant from operations or POS). */
export function defaultGraph(args: { propertyId: string; rooms: number; roomsOutOfOrder: number; peakOccupancy: number; staffingCoverage: number; nowIso: string; source: string; spa?: { slotsPerDay: number; slotsSold: number; therapistsPlanned: number; therapistsAvailable: number; treatmentRooms: number; openingHours: number } | null; restaurant?: { covers: number; coversSold: number; kitchenCapacity: number; serviceStaffPlanned: number; serviceStaffAvailable: number } | null; outdoorUnits?: { units: number; unitsSold: number; cleaningCapacityPerDay: number; weatherSensitive: boolean } | null }): CapacityGraph {
  const t = args.nowIso, src = args.source, pid = args.propertyId;
  const res: CapacityResource[] = [
    { id: "R-ROOMS", propertyId: pid, type: "rooms", resource: "rooms in service", unit: "rooms/night", maximumCapacity: args.rooms, availableCapacity: args.rooms - args.roomsOutOfOrder, utilizedCapacity: Math.round(args.rooms * args.peakOccupancy), timeWindow: "peak nights", operatingHours: null, staffDependency: ["R-HOUSEKEEPING"], equipmentDependency: [], weatherDependency: false, source: src, timestamp: t, confidence: 0.9 },
    { id: "R-HOUSEKEEPING", propertyId: pid, type: "housekeeping", resource: "housekeeping hours vs plan", unit: "ratio", maximumCapacity: 1, availableCapacity: args.staffingCoverage, utilizedCapacity: args.staffingCoverage, timeWindow: "last 4 weeks", operatingHours: null, staffDependency: [], equipmentDependency: [], weatherDependency: false, source: src, timestamp: t, confidence: 0.7 },
  ];
  const nodes: CapacityNode[] = [{ id: "N-ROOMS", name: "Rooms", activity: "rooms", primaryResource: "R-ROOMS", requires: ["R-HOUSEKEEPING"], revenueShare: null }];
  if (args.spa) {
    res.push(
      { id: "R-SLOTS", propertyId: pid, type: "treatment_slots", resource: "treatment slots", unit: "slots/day", maximumCapacity: args.spa.slotsPerDay, availableCapacity: args.spa.slotsPerDay, utilizedCapacity: args.spa.slotsSold, timeWindow: "per day", operatingHours: args.spa.openingHours, staffDependency: ["R-THERAPISTS"], equipmentDependency: ["R-TREATMENT-ROOMS"], weatherDependency: false, source: src, timestamp: t, confidence: 0.8 },
      { id: "R-THERAPISTS", propertyId: pid, type: "therapists", resource: "therapists available vs planned", unit: "therapists", maximumCapacity: args.spa.therapistsPlanned, availableCapacity: args.spa.therapistsAvailable, utilizedCapacity: args.spa.therapistsAvailable, timeWindow: "current rota", operatingHours: args.spa.openingHours, staffDependency: [], equipmentDependency: [], weatherDependency: false, source: src, timestamp: t, confidence: 0.8 },
      { id: "R-TREATMENT-ROOMS", propertyId: pid, type: "treatment_rooms", resource: "treatment rooms", unit: "rooms", maximumCapacity: args.spa.treatmentRooms, availableCapacity: args.spa.treatmentRooms, utilizedCapacity: args.spa.treatmentRooms, timeWindow: "per day", operatingHours: args.spa.openingHours, staffDependency: [], equipmentDependency: [], weatherDependency: false, source: src, timestamp: t, confidence: 0.9 },
    );
    nodes.push({ id: "N-SPA", name: "Spa treatments", activity: "spa", primaryResource: "R-SLOTS", requires: ["R-THERAPISTS", "R-TREATMENT-ROOMS"], revenueShare: null });
  }
  if (args.restaurant) {
    res.push(
      { id: "R-COVERS", propertyId: pid, type: "covers", resource: "covers per service", unit: "covers", maximumCapacity: args.restaurant.covers, availableCapacity: args.restaurant.covers, utilizedCapacity: args.restaurant.coversSold, timeWindow: "per service", operatingHours: null, staffDependency: ["R-SERVICE-STAFF"], equipmentDependency: ["R-KITCHEN"], weatherDependency: false, source: src, timestamp: t, confidence: 0.8 },
      { id: "R-KITCHEN", propertyId: pid, type: "kitchen", resource: "kitchen capacity", unit: "covers", maximumCapacity: args.restaurant.covers, availableCapacity: args.restaurant.kitchenCapacity, utilizedCapacity: args.restaurant.coversSold, timeWindow: "per service", operatingHours: null, staffDependency: [], equipmentDependency: [], weatherDependency: false, source: src, timestamp: t, confidence: 0.7 },
      { id: "R-SERVICE-STAFF", propertyId: pid, type: "service_staff", resource: "service staff vs plan", unit: "staff", maximumCapacity: args.restaurant.serviceStaffPlanned, availableCapacity: args.restaurant.serviceStaffAvailable, utilizedCapacity: args.restaurant.serviceStaffAvailable, timeWindow: "current rota", operatingHours: null, staffDependency: [], equipmentDependency: [], weatherDependency: false, source: src, timestamp: t, confidence: 0.8 },
    );
    nodes.push({ id: "N-RESTAURANT", name: "Restaurant", activity: "restaurant", primaryResource: "R-COVERS", requires: ["R-KITCHEN", "R-SERVICE-STAFF"], revenueShare: null });
  }
  if (args.outdoorUnits) {
    res.push(
      { id: "R-UNITS", propertyId: pid, type: "units", resource: "units", unit: "units/night", maximumCapacity: args.outdoorUnits.units, availableCapacity: args.outdoorUnits.units, utilizedCapacity: args.outdoorUnits.unitsSold, timeWindow: "peak nights", operatingHours: null, staffDependency: ["R-CLEANING"], equipmentDependency: [], weatherDependency: args.outdoorUnits.weatherSensitive, source: src, timestamp: t, confidence: 0.85 },
      { id: "R-CLEANING", propertyId: pid, type: "cleaning", resource: "unit turnarounds per day", unit: "units/day", maximumCapacity: args.outdoorUnits.units, availableCapacity: args.outdoorUnits.cleaningCapacityPerDay, utilizedCapacity: args.outdoorUnits.unitsSold, timeWindow: "changeover day", operatingHours: null, staffDependency: [], equipmentDependency: [], weatherDependency: false, source: src, timestamp: t, confidence: 0.7 },
    );
    nodes.push({ id: "N-OUTDOOR", name: "Outdoor units", activity: "outdoor", primaryResource: "R-UNITS", requires: ["R-CLEANING"], revenueShare: null });
  }
  return { nodes, resources: res };
}
