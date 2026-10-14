import "server-only";
import { runCycle, EngineBus, emptyMemory, COUNTRY_HOUSE_34, newModel, appendCycle, cycleInputFromModel, modelSummary, type ModelStore, type PropertyModel, type CycleInput, type CycleResult, type EngineEvent, type LearningRecord, type PropertyMemory, type ExternalContext, type PropertySpec, type WeatherForecast } from "@anesis/engine";
import { buildContext, emptyRegisters, type OperatorRegisters } from "@/lib/connectors";
import { defaultStore } from "./fileStore";

/**
 * Engine store — the application's system of record for engine runs, property memory and operator registers.
 * STATUS: the PROPERTY MODEL (spec, calibration, cycles, pre-registrations, budgets, measurements, memory) is
 * PERSISTED through `ModelStore` (file store by default, one JSON per property; a database can replace it behind
 * the same interface). Full run records with their external-context snapshots stay in process memory: they are
 * large and reproducible from the model plus the snapshot. Every record is the output of a real `runCycle` call.
 */
export interface RunRecord {
  readonly id: string; readonly createdAt: string; readonly label: string;
  readonly input: Omit<CycleInput, "bus" | "memory" | "propertyMemory" | "context"> & { readonly memoryUsed: number; readonly resolvedConstraints: number; readonly contextFetchedAt: string; readonly connected: string[] };
  readonly context: ExternalContext;
  readonly result: CycleResult;
  readonly durationMs: number;
}
export interface Persistence { saveRun(run: RunRecord): Promise<void>; saveLearning(record: LearningRecord): Promise<void> }

interface State { runs: RunRecord[]; memory: LearningRecord[]; propertyMemory: PropertyMemory; registers: OperatorRegisters; seq: number; listeners: Set<(e: EngineEvent & { runId: string }) => void>; model: PropertyModel | null; store: ModelStore }
const g = globalThis as unknown as { __anesisEngineState?: State };
const state: State = (g.__anesisEngineState ??= { runs: [], memory: [], propertyMemory: emptyMemory(COUNTRY_HOUSE_34.id), registers: emptyRegisters(), seq: 0, listeners: new Set(), model: null, store: defaultStore() });

/** Loads the persisted property model once per process (or creates it); the process copy of memory mirrors it. */
export async function loadModel(spec: PropertySpec = COUNTRY_HOUSE_34): Promise<PropertyModel> {
  if (state.model && state.model.propertyId === spec.id) return state.model;
  const now = new Date().toISOString();
  const m = (await state.store.load(spec.id)) ?? newModel(spec, now);
  state.model = m; state.memory = [...m.calibration]; state.propertyMemory = m.memory; state.seq = Math.max(state.seq, m.cycles.length);
  return m;
}
export const model = (): PropertyModel | null => state.model;
export const modelStatement = (nowIso = new Date().toISOString()): string => state.model ? modelSummary(state.model, nowIso) : "no persisted model loaded yet";

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
  const spec: PropertySpec = { ...COUNTRY_HOUSE_34, ...req.spec };
  const m = await loadModel(COUNTRY_HOUSE_34);
  const id = `RUN-${String(++state.seq).padStart(3, "0")}`;
  const bus = new EngineBus();
  const fan = (e: EngineEvent) => { const ev = { ...e, runId: id }; req.onEvent?.(ev); for (const l of state.listeners) l(ev); };
  bus.subscribe(fan);
  bus.emit("CONTEXT_FETCHING", "OBSERVING", req.contextSnapshot ? "reusing the previous run's external-context snapshot" : req.offline ? "offline: no live connector is called" : "calling live connectors (weather, public holidays, exchange rates); contract-only connectors report their state");
  const context = req.contextSnapshot ?? (await buildContext(spec, state.registers, { weather: req.weatherOverride, offline: req.offline }));
  const useMem = req.useMemory !== false;
  const fromModel = cycleInputFromModel(m);
  const mem = useMem ? fromModel.memory : [];
  const pmem = useMem ? fromModel.propertyMemory : emptyMemory(spec.id);
  const input: CycleInput = { seed: req.seed ?? 1, budgetGbp: req.budgetGbp ?? 16_000, spec: req.spec, benchmarks: req.benchmarks, params: req.params, memory: mem, propertyMemory: pmem, context, cycleNumber: useMem ? fromModel.cycleNumber : state.seq, now: new Date().toISOString(), bus };
  const t0 = Date.now();
  const result = runCycle(input);
  const run: RunRecord = {
    id, createdAt: input.now!, label: req.label ?? `seed ${input.seed} · £${input.budgetGbp.toLocaleString("en-GB")}`,
    input: { seed: input.seed, budgetGbp: input.budgetGbp, spec: input.spec, benchmarks: input.benchmarks, params: input.params, cycleNumber: input.cycleNumber, now: input.now, memoryUsed: mem.length, resolvedConstraints: pmem.measured.filter((m) => m.status === "ESTABLISHED").length, contextFetchedAt: context.fetchedAt, connected: context.connectors.filter((c) => c.status === "CONNECTED").map((c) => c.id) },
    context, result, durationMs: Date.now() - t0,
  };
  state.runs.push(run);
  if (useMem) {
    state.model = appendCycle(m, result, { id, at: run.createdAt });
    state.memory = [...state.model.calibration]; state.propertyMemory = state.model.memory;
    await state.store.save(state.model);           // the model is the asset: it is written before the run is reported
    bus.emit("MODEL_PERSISTED", "LEARNING", modelSummary(state.model, run.createdAt));
  }
  void persistence?.saveRun(run); if (result.learning) void persistence?.saveLearning(result.learning);
  return run;
}

export function updateRegisters(patch: Partial<OperatorRegisters>): OperatorRegisters { state.registers = { ...state.registers, ...patch }; return state.registers; }
export async function resetAll(): Promise<void> { state.runs.length = 0; state.memory = []; state.propertyMemory = emptyMemory(COUNTRY_HOUSE_34.id); state.registers = emptyRegisters(); state.seq = 0; state.model = null; await state.store.remove(COUNTRY_HOUSE_34.id); }
