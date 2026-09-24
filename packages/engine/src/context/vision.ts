/**
 * CAMERA / COMPUTER-VISION LAYER — the abstraction exists; no source is connected in this environment.
 * Camera Source → Video Stream → Frame Sampling → Vision Model → Structured Observation → Confidence → Engine.
 * The record types forbid identity data by construction (see types.ts VisionObservation) and the
 * governance rules are in docs/COMPUTER_VISION_GOVERNANCE.md.
 */
import type { CameraSource, ConnectorContract, VisionObservation } from "./types.js";

export interface VisionAdapter {
  /** Returns structured observations for a configured source, or throws with a clear reason. Never returns invented frames. */
  sample(source: CameraSource, at: string): Promise<VisionObservation[]>;
}

export function cameraConnector(sources: readonly CameraSource[], env: Readonly<Record<string, string | undefined>>, now: string): ConnectorContract {
  const configured = sources.filter((s) => s.configured && env[s.streamUrlEnv]);
  return {
    id: "CONN-CAMERA", domain: "vision", name: "Camera / computer vision", provider: "RTSP/HLS source + on-premise vision model (contract)", kind: "contract",
    requires: sources.length ? sources.map((s) => s.streamUrlEnv) : ["ANESIS_CAMERA_<ZONE>_STREAM_URL"], fields: ["zone", "queue_length or occupancy_estimate", "confidence", "sampledAt", "modelId"], freshness: "REAL_TIME",
    status: configured.length ? "CONNECTED" : "SOURCE_NOT_CONFIGURED",
    statusNote: configured.length ? `${configured.length} source(s) configured` : "CAMERA SOURCE NOT CONNECTED — no stream URL is configured; no observation is produced or simulated",
    lastFetchedAt: null, legal: "operational counts only; no facial recognition, no identity tracking; retention limited per source; lawful basis recorded per source",
  };
}

/** Guard used by any adapter: rejects observations that carry anything beyond the allowed structured fields. */
export function assertNoIdentityData(o: Record<string, unknown>): void {
  const forbidden = ["face", "faceId", "identity", "personId", "name", "plate", "embedding", "image", "frame", "biometric"];
  for (const k of Object.keys(o)) if (forbidden.some((f) => k.toLowerCase().includes(f.toLowerCase()))) throw new Error(`vision observation carries forbidden field '${k}'`);
}
