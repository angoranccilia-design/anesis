/** Engine event bus: every event carries a real timestamp captured at emission, a sequence number and the engine state. */
import type { EngineEvent, EngineState } from "./model.js";

export type Listener = (e: EngineEvent) => void;

export class EngineBus {
  private seq = 0;
  private current: EngineState = "IDLE";
  private readonly log: EngineEvent[] = [];
  private readonly listeners = new Set<Listener>();
  constructor(private readonly clock: () => string = () => new Date().toISOString()) {}
  get state(): EngineState { return this.current; }
  get events(): readonly EngineEvent[] { return this.log; }
  subscribe(l: Listener): () => void { this.listeners.add(l); return () => this.listeners.delete(l); }
  emit(type: string, state: EngineState, detail: string, refs: readonly string[] = []): EngineEvent {
    this.current = state;
    const e: EngineEvent = { seq: ++this.seq, at: this.clock(), type, state, detail, refs };
    this.log.push(e); for (const l of this.listeners) l(e);
    return e;
  }
}
