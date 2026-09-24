import "server-only";
import { runCycle, EngineBus, type CycleInput, type CycleResult, type EngineEvent, type LearningRecord } from "@anesis/engine";

/**
 * Engine store — the application's system of record for engine runs.
 *
 * STATUS: IMPLEMENTED as process memory (survives across requests while the server runs; lost on restart).
 * Database persistence through @anesis/db is PLANNED: the `Persistence` interface below is the seam, and
 * nothing in the routes depends on where records live. Nothing here is fabricated: every record is the
 * output of a real `runCycle` call and every event has the timestamp captured when it was emitted.
 */
export interface RunRecord {
  readonly id: string;
  readonly createdAt: string;
  readonly label: string;
  readonly input: Omit<CycleInput, "bus" | "memory"> & { readonly memoryUsed: number };
  readonly result: CycleResult;
  readonly durationMs: number;
}

export interface Persistence {
  saveRun(run: RunRecord): Promise<void>;
  saveLearning(record: LearningRecord): Promise<void>;
}

interface State {
  runs: RunRecord[];
  memory: LearningRecord[];          // Anesis Memory — property level (one simulated property so far)
  seq: number;
  listeners: Set<(e: EngineEvent & { runId: string }) => void>;
}

const g = globalThis as unknown as { __anesisEngineState?: State };
const state: State = (g.__anesisEngineState ??= { runs: [], memory: [], seq: 0, listeners: new Set() });

export const listRuns = (): readonly RunRecord[] => state.runs;
export const getRun = (id: string): RunRecord | undefined => state.runs.find((r) => r.id === id);
export const latestRun = (): RunRecord | undefined => state.runs.at(-1);
export const memory = (): readonly LearningRecord[] => state.memory;

export function subscribe(l: (e: EngineEvent & { runId: string }) => void): () => void {
  state.listeners.add(l); return () => state.listeners.delete(l);
}

export interface RunRequest {
  readonly seed?: number;
  readonly budgetGbp?: number;
  readonly spec?: CycleInput["spec"];
  readonly benchmarks?: CycleInput["benchmarks"];
  readonly params?: CycleInput["params"];
  readonly useMemory?: boolean;      // default true: the run learns from previous measured cycles
  readonly label?: string;
  readonly onEvent?: (e: EngineEvent & { runId: string }) => void;
}

/** Executes a real decision cycle and records it. Deterministic for identical inputs and memory. */
export function executeRun(req: RunRequest, persistence: Persistence | null = null): RunRecord {
  const id = `RUN-${String(++state.seq).padStart(3, "0")}`;
  const bus = new EngineBus();
  const fan = (e: EngineEvent) => { const ev = { ...e, runId: id }; req.onEvent?.(ev); for (const l of state.listeners) l(ev); };
  bus.subscribe(fan);
  const mem = req.useMemory === false ? [] : [...state.memory];
  const input: CycleInput = {
    seed: req.seed ?? 1, budgetGbp: req.budgetGbp ?? 16_000, spec: req.spec, benchmarks: req.benchmarks, params: req.params,
    memory: mem, cycleNumber: state.seq, now: new Date().toISOString(), bus,
  };
  const t0 = Date.now();
  const result = runCycle(input);
  const run: RunRecord = {
    id, createdAt: input.now!, label: req.label ?? `seed ${input.seed} · £${input.budgetGbp.toLocaleString("en-GB")}`,
    input: { seed: input.seed, budgetGbp: input.budgetGbp, spec: input.spec, benchmarks: input.benchmarks, params: input.params, cycleNumber: input.cycleNumber, now: input.now, memoryUsed: mem.length },
    result, durationMs: Date.now() - t0,
  };
  state.runs.push(run);
  if (result.learning && req.useMemory !== false) state.memory.push(result.learning);
  void persistence?.saveRun(run);
  if (result.learning) void persistence?.saveLearning(result.learning);
  return run;
}

export function resetAll(): void { state.runs.length = 0; state.memory.length = 0; state.seq = 0; }
