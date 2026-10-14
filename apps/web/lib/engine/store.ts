import "server-only";
import { runCycle, EngineBus, emptyMemory, COUNTRY_HOUSE_34, newModel, appendCycle, cycleInputFromModel, modelSummary, type ModelStore, type PropertyModel, type CycleInput, type CycleResult, type EngineEvent, type LearningRecord, type PropertyMemory, type ExternalContext, type PropertySpec, type WeatherForecast } from "@anesis/engine";
import { buildContext, emptyRegisters, type OperatorRegisters } from "@/lib/connectors";
import { defaultStore } from "./fileStore";
import { getRuntime, runtimeConfigured } from "./runtimeDb";

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

/** The property the console serves: declared in the runtime registry when a database is configured, else the simulated one. */
export const propertyId = (): string => process.env.ANESIS_PROPERTY_ID ?? COUNTRY_HOUSE_34.id;
export async function declaredSpec(): Promise<PropertySpec> {
  if (!runtimeConfigured()) return COUNTRY_HOUSE_34;
  const { rt, db } = await getRuntime(); return (await rt.loadProperty(db, propertyId())) ?? COUNTRY_HOUSE_34;
}

/** Loads the persisted property model once per process (or creates it); the process copy of memory mirrors it. */
export async function loadModel(spec?: PropertySpec): Promise<PropertyModel> {
  spec ??= await declaredSpec();
  if (state.model && state.model.propertyId === spec.id) return state.model;
  const now = new Date().toISOString();
  const m = (await state.store.load(spec.id)) ?? newModel(spec, now);
  state.model = m; state.memory = [...m.calibration]; state.propertyMemory = m.memory; state.seq = Math.max(state.seq, m.cycles.length);
  return m;
}
export const model = (): PropertyModel | null => state.model;
export const modelStatement = (nowIso = new Date().toISOString()): string => state.model ? modelSummary(state.model, nowIso) : "no persisted model loaded yet";

const fromStored = (c: { runId: string; at: string; label: string; durationMs: number; result: CycleResult }): RunRecord => ({ id: c.runId, createdAt: c.at, label: c.label, input: { seed: c.result.input.seed, budgetGbp: c.result.input.budgetGbp, spec: c.result.input.spec, benchmarks: c.result.input.benchmarks, params: c.result.input.params, cycleNumber: c.result.input.cycleNumber, now: c.result.input.now, memoryUsed: c.result.input.memory?.length ?? 0, resolvedConstraints: 0, contextFetchedAt: c.result.context.fetchedAt, connected: c.result.context.connectors.filter((x) => x.status === "CONNECTED").map((x) => x.id) }, context: c.result.context, result: c.result, durationMs: c.durationMs });
/** Runs: persisted cycle results when a database is configured (the worker's and the console's alike), else this process's runs. Oldest first. */
export async function listRuns(): Promise<readonly RunRecord[]> {
  if (!runtimeConfigured()) return state.runs;
  const { rt, db } = await getRuntime(); return (await rt.listCycleResults(db, propertyId(), 200)).map(fromStored).reverse();
}
export async function getRun(id: string): Promise<RunRecord | undefined> {
  const local = state.runs.find((r) => r.id === id); if (local || !runtimeConfigured()) return local;
  const { rt, db } = await getRuntime(); const c = await rt.loadCycleResult(db, propertyId(), id); return c ? fromStored(c) : undefined;
}
export const latestRun = async (): Promise<RunRecord | undefined> => (await listRuns()).at(-1);
export const memory = (): readonly LearningRecord[] => state.memory;
export const propertyMemory = (): PropertyMemory => state.propertyMemory;
/** Operator registers of the property: persisted in the runtime when a database is configured (what the worker reads), else this process. The latest PMS import is merged in as the PMS snapshot. */
export async function registers(): Promise<OperatorRegisters> {
  if (!runtimeConfigured()) return state.registers;
  const { rt, db } = await getRuntime(); const base = await rt.loadRegisters(db, propertyId());
  const imp = await rt.latestImport(db, propertyId()); if (!imp || !imp.snapshot) return base;
  return { ...base, systems: { ...base.systems, pms: imp.snapshot }, sourceQuality: { ...base.sourceQuality, "CONN-PMS": imp.quality } };
}
export function subscribe(l: (e: EngineEvent & { runId: string }) => void): () => void { state.listeners.add(l); return () => state.listeners.delete(l); }

export interface RunRequest {
  readonly seed?: number; readonly budgetGbp?: number; readonly spec?: Partial<PropertySpec>; readonly benchmarks?: CycleInput["benchmarks"]; readonly params?: CycleInput["params"];
  readonly evidencePolicy?: CycleInput["evidencePolicy"];   // default: verified_only for a declared real property, simulated_allowed for the simulated demo
  readonly useMemory?: boolean; readonly label?: string; readonly weatherOverride?: WeatherForecast | null; readonly offline?: boolean;
  readonly contextSnapshot?: ExternalContext;          // reuse a previous run's context (exact repeat)
  readonly onEvent?: (e: EngineEvent & { runId: string }) => void;
}

/** Fetches the external context (or reuses a snapshot), executes a real decision cycle and records it. */
export async function executeRun(req: RunRequest, persistence: Persistence | null = null): Promise<RunRecord> {
  const declared = await declaredSpec();
  const spec: PropertySpec = { ...declared, ...req.spec };
  const m = await loadModel(declared);
  if (runtimeConfigured()) state.seq = Math.max(state.seq, (await listRuns()).length, m.cycles.length);
  const id = `RUN-${String(++state.seq).padStart(3, "0")}`;
  const bus = new EngineBus();
  const fan = (e: EngineEvent) => { const ev = { ...e, runId: id }; req.onEvent?.(ev); for (const l of state.listeners) l(ev); };
  bus.subscribe(fan);
  bus.emit("CONTEXT_FETCHING", "OBSERVING", req.contextSnapshot ? "reusing the previous run's external-context snapshot" : req.offline ? "offline: no live connector is called" : "calling live connectors (weather, public holidays, exchange rates); contract-only connectors report their state");
  const context = req.contextSnapshot ?? (await buildContext(spec, await registers(), { weather: req.weatherOverride, offline: req.offline }));
  const useMem = req.useMemory !== false;
  const fromModel = cycleInputFromModel(m);
  const mem = useMem ? fromModel.memory : [];
  const pmem = useMem ? fromModel.propertyMemory : emptyMemory(spec.id);
  const regs = await registers();
  const evidencePolicy = req.evidencePolicy ?? (declared.id === COUNTRY_HOUSE_34.id ? "simulated_allowed" : "verified_only");
  const benchmarkSources = Object.fromEntries(Object.entries(regs.benchmarks ?? {}).map(([k, b]) => [k, { source: b.source, asOf: b.asOf }]));
  const input: CycleInput = { evidencePolicy, benchmarkSources, informationObtained: regs.informationObtained ?? {}, seed: req.seed ?? 1, budgetGbp: req.budgetGbp ?? 16_000, spec, benchmarks: { ...Object.fromEntries(Object.entries(regs.benchmarks ?? {}).map(([k, b]) => [k, b.value])), ...req.benchmarks }, params: req.params, memory: mem, propertyMemory: pmem, context, cycleNumber: useMem ? fromModel.cycleNumber : state.seq, now: new Date().toISOString(), bus };
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
  if (runtimeConfigured()) { const { rt, db } = await getRuntime(); await rt.saveCycleResult(db, { runId: id, propertyId: spec.id, label: run.label, at: run.createdAt, durationMs: run.durationMs, result }); }
  void persistence?.saveRun(run); if (result.learning) void persistence?.saveLearning(result.learning);
  return run;
}

export async function updateRegisters(patch: Partial<OperatorRegisters>): Promise<OperatorRegisters> {
  if (!runtimeConfigured()) { state.registers = { ...state.registers, ...patch }; return state.registers; }
  const { rt, db } = await getRuntime(); await rt.saveRegisters(db, propertyId(), patch); return registers();
}
/** Destructive (founder, confirmed): erases this process's runs and the property's model, registers, cycle results and context snapshots. Imports and contracts are audit records and stay. */
export async function resetAll(): Promise<void> {
  const id = propertyId();
  state.runs.length = 0; state.memory = []; state.propertyMemory = emptyMemory(id); state.registers = emptyRegisters(); state.seq = 0; state.model = null;
  await state.store.remove(id);
  if (runtimeConfigured()) { const { rt, db } = await getRuntime(); await rt.clearRegisters(db, id); await db.query("delete from cycle_results where property_id = $1", [id]); await db.query("delete from context_snapshots where property_id = $1", [id]); }
}
