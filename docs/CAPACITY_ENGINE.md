# Capacity constraint engine

Capacity is a network, not a room count. `packages/engine/src/context/capacity.ts`.

**Model.** Property → capacity nodes (rooms, spa, restaurant, experience, outdoor) → capacity resources → dependencies → utilisation → bottleneck. Each resource: `id, propertyId, type, resource, unit, maximumCapacity, availableCapacity, utilizedCapacity, timeWindow, operatingHours, staffDependency[], equipmentDependency[], weatherDependency, source, timestamp, confidence`. Resource types: rooms, housekeeping, reception, maintenance, treatment_rooms, therapists, treatment_slots, opening_hours, tables, covers, kitchen, service_staff, guides, vehicles, equipment, time_slots, units, cleaning, participant_limit.

**Dependency graph.** A node's attainable capacity = nominal capacity × min(available ÷ maximum) over the transitive closure of its dependencies (staff and equipment). Weather-dependent resources are halved under poor weather. Example: treatment rooms 100 %, therapists 82 %, equipment 100 % → attainable spa capacity 82 %. Utilisation is measured against **attainable**, not nominal: 58 slots sold on 60 nominal is 118 % of the 49 attainable. **Nominal capacity ≠ attainable capacity.**

**Binding rule (declared).** A node binds at utilisation of attainable ≥ 92 %, or when a camera reports a recurring estimated wait ≥ 15 minutes (queue length × 3 minutes of reception service per person). Camera input enters only as structured counts (see `COMPUTER_VISION_GOVERNANCE.md`); with no source configured nothing is produced.

**Effect on decisions.** Each non-room node becomes a CAPACITY constraint. It enters the acquisition chain (demand → conversion → rooms capacity → service capacity → operations) only when at least 30 % of property-wide acquisition lands on that activity (declared per property type, or the node's stated revenue share): a spa binds a spa resort's acquisition, and is reported "outside the room-booking chain" for a hotel whose spa is ancillary. When a node in the chain binds, demand and conversion actions are blocked with: *"Demand exists, but incremental acquisition would currently collide with an operational capacity constraint (spa treatments; therapists at 82 %)."*

**Demand shape.** Peak occupancy ≥ 85 % with annual occupancy ≤ 70 % is read as "capacity binds only at peak; off-peak inventory is unsold": an off-peak demand programme (I-006) is generated, its chain excludes peak capacity, and acquisition aimed at peak demand stays blocked.

**Status.** IMPLEMENTED and tested (hotel spa, spa resort, restaurant node, weather-dependent outdoor units). Graphs come from an explicit register or are derived from the property, operations and POS snapshots. Real resource data (rotas, slot systems) arrives through the PMS/POS connectors when connected.
