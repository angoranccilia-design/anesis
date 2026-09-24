import "server-only";
import { runCycle, EngineBus, emptyMemory, COUNTRY_HOUSE_34, type CycleInput, type CycleResult, type EngineEvent, type LearningRecord, type PropertyMemory, type ExternalContext, type PropertySpec, type WeatherForecast } from "@anesis/engine";
import { buildContext, emptyRegisters, type OperatorRegisters } from "@/lib/connectors";

/**
 * Engine store — the application's system of record for engine runs, property memory and operator registers.
 * STATUS: IMPLEMENTED as process memory (survives across requests while the server runs; lost on restart).
 * Database persistence through @anesis/db is PLANNED behind the `Persistence` seam. Every record is the output
 * of a real `runCycle` call; every run stores the exact external-context snapshot it used, so "run again" is exact.
 */
export interface RunRecord {
  readonly id: string; readonly createdAt: string; readonly label: string;
  readonly input: Omit<CycleInput, "bus" | "memory" | "propertyMemory" | "context"> & { readonly memoryUsed: number; readonly resolvedConstraints: number; readonly contextFetchedAt: string; readonly connected: string[] };
  readonly context: ExternalContext;
  readonly result: CycleResult;
  readonly durationMs: number;
}
export interface Persistence { saveRun(run: RunRecord): Promise<void>; saveLearning(record: LearningRecord): Promise<void> }

interface State { runs: RunRecord[]; memory: LearningRecord[]; propertyMemory: PropertyMemory; registers: OperatorRegisters; seq: number; listeners: Set<(e: EngineEvent & { runId: string }) => void> }
const g = globalThis as unknown as { __anesisEngineState?: State };
const state: State = (g.__anesisEngineState ??= { runs: [], memory: [], propertyMemory: emptyMemory(COUNTRY_HOUSE_34.id), registers: emptyRegisters(), seq: 0, listeners: new Set() });

export const listRuns = (): readonly RunRecord[] => state.runs;
export const getRun = (id: string): RunRecord | undefined => state.runs.find((r) => r.id === id);
export const latestRun = (): RunRecord | undefined => state.runs.at(-1);
export const memory = (): readonly LearningRecord[] => state.memory;
export const propertyMemory = (): PropertyMemory => state.propertyMemory;
export const registers = (): OperatorRegisters => state.registers;
export function subscribe(l: (e: EngineEvent & { runId: string }) => void): () => void { state.listeners.add(l); return () => state.listeners.delete(l); }

export interface RunRequest {
  readonly seed?: number; readonly budgetGbp?: number; readonly spec?: Partial<PropertySpec>; readonly benchmarks?: CycleInput["benchmarks"]; readonly params?: CycleInput["params"];
  readonly useMemory?: boolean; readonly label?: string; readonly weatherOverride?: WeatherForecast | null; readonly offline?: boolean;
  readonly contextSnapshot?: ExternalContext;          // reuse a previous run's context (exact repeat)
  readonly onEvent?: (e: EngineEvent & { runId: string }) => void;
}

/** Fetches the external context (or reuses a snapshot), executes a real decision cycle and records it. */
export async function executeRun(req: RunRequest, persistence: Persistence | null = null): Promise<RunRecord> {
  const id = `RUN-${String(++state.seq).padStart(3, "0")}`;
  const spec: PropertySpec = { ...COUNTRY_HOUSE_34, ...req.spec };
  const bus = new EngineBus();
  const fan = (e: EngineEvent) => { const ev = { ...e, runId: id }; req.onEvent?.(ev); for (const l of state.listeners) l(ev); };
  bus.subscribe(fan);
  bus.emit("CONTEXT_FETCHING", "OBSERVING", req.contextSnapshot ? "reusing the previous run's external-context snapshot" : req.offline ? "offline: no live connector is called" : "calling live connectors (weather, public holidays, exchange rates); contract-only connectors report their state");
  const context = req.contextSnapshot ?? (await buildContext(spec, state.registers, { weather: req.weatherOverride, offline: req.offline }));
  const useMem = req.useMemory !== false;
  const mem = useMem ? [...state.memory] : [];
  const pmem = useMem ? state.propertyMemory : emptyMemory(spec.id);
  const input: CycleInput = { seed: req.seed ?? 1, budgetGbp: req.budgetGbp ?? 16_000, spec: req.spec, benchmarks: req.benchmarks, params: req.params, memory: mem, propertyMemory: pmem, context, cycleNumber: state.seq, now: new Date().toISOString(), bus };
  const t0 = Date.now();
  const result = runCycle(input);
  const run: RunRecord = {
    id, createdAt: input.now!, label: req.label ?? `seed ${input.seed} · £${input.budgetGbp.toLocaleString("en-GB")}`,
    input: { seed: input.seed, budgetGbp: input.budgetGbp, spec: input.spec, benchmarks: input.benchmarks, params: input.params, cycleNumber: input.cycleNumber, now: input.now, memoryUsed: mem.length, resolvedConstraints: pmem.measured.filter((m) => m.status === "ESTABLISHED").length, contextFetchedAt: context.fetchedAt, connected: context.connectors.filter((c) => c.status === "CONNECTED").map((c) => c.id) },
    context, result, durationMs: Date.now() - t0,
  };
  state.runs.push(run);
  if (useMem) { if (result.learning) state.memory.push(result.learning); state.propertyMemory = result.memoryAfter; }
  void persistence?.saveRun(run); if (result.learning) void persistence?.saveLearning(result.learning);
  return run;
}

export function updateRegisters(patch: Partial<OperatorRegisters>): OperatorRegisters { state.registers = { ...state.registers, ...patch }; return state.registers; }
export function resetAll(): void { state.runs.length = 0; state.memory.length = 0; state.propertyMemory = emptyMemory(COUNTRY_HOUSE_34.id); state.registers = emptyRegisters(); state.seq = 0; }
