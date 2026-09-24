# Computer vision governance

Anesis may, in future, take structured observations from cameras a property already operates: queue length at a reception, table occupancy in a restaurant, approximate parking occupancy, utilisation of a pool or treatment area. The purpose is **operational and commercial observation of spaces, never observation of people**. This document binds any implementation.

## Boundaries

1. **No facial recognition, ever, by default or by configuration.** The observation record type (`VisionObservation`) has no field for a face, an identity, a name, a plate, an embedding, an image or a frame, and `assertNoIdentityData()` rejects any record that carries one. A future adapter that needs such a field cannot be merged without changing this document.
2. **No identity tracking.** No re-identification across cameras or over time; counts and estimates only.
3. **Data minimisation.** Frames are sampled, reduced to a count or a ratio with a confidence, and discarded; `frameRetained` is always `false`. Retention of the structured observation is per source (`retentionHours`) and defaults to the minimum the commercial use needs.
4. **Lawful basis and responsibility.** The property (data controller) records the lawful basis per camera source (`legalBasis`), signage and any impact assessment its jurisdiction requires. Anesis processes only what the property lawfully captures; it does not install or operate cameras.
5. **Commercial vs surveillance boundary.** Permitted purposes are enumerated in the type (`queue`, `occupancy`, `table_occupancy`, `parking`, `capacity_utilisation`). Monitoring of staff performance, of individuals, or of private areas is outside the product and cannot be configured.
6. **Human oversight.** A vision observation enters the engine as a signal with its own confidence and freshness, passes the same relevance test as every other signal, and can at most raise or lower a capacity or operational constraint. It never triggers an action on its own; every action remains under the governance levels in `GOVERNANCE.md`.
7. **Honesty of state.** Without a configured stream the connector reports **SOURCE NOT CONFIGURED** and the console says **CAMERA SOURCE NOT CONNECTED**. No simulated camera output exists anywhere in the code base.

## Pipeline (contract)

Camera source (RTSP/HLS, on-premise) → stream → frame sampling (e.g. one frame per minute) → on-premise vision model → `VisionObservation { cameraId, zone, metric, value, confidence, sampledAt, modelId, frameRetained: false }` → `operationsSignals()` → relevance → engine.

## Status

Abstraction and guards: IMPLEMENTED and tested. Adapter, model and stream: NOT CONNECTED. Nothing in this environment sees a camera.
