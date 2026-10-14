import "server-only";
import { COUNTRY_HOUSE_34, type CycleResult } from "@anesis/engine";
import { closureDossier, type InterventionContract } from "@anesis/execution";
import { listRuns, getRun, registers, propertyId, declaredSpec, type RunRecord } from "../engine/store";
import { getRuntime, runtimeConfigured } from "../engine/runtimeDb";
import { demoMode } from "../demo";

/** Everything the console pages read: the latest cycle result, the runs, the contracts, the imports, the property, the health. All from the store; nothing computed here. */
export interface ConsoleContext { readonly propertyId: string; readonly demo: boolean; readonly simulatedProperty: boolean; readonly runtime: boolean }
export async function consoleContext(): Promise<ConsoleContext> { const id = propertyId(); return { propertyId: id, demo: demoMode(), simulatedProperty: id === COUNTRY_HOUSE_34.id, runtime: runtimeConfigured() }; }

export async function latest(): Promise<RunRecord | undefined> { return (await listRuns()).at(-1); }
export async function run(id: string): Promise<RunRecord | undefined> { return id === "latest" ? latest() : getRun(id); }
export async function runs(): Promise<readonly RunRecord[]> { return listRuns(); }
export { registers, declaredSpec };

export interface ImportRow { readonly id: number; readonly filename: string; readonly sha256: string; readonly importedAt: string; readonly periodFrom: string | null; readonly periodTo: string | null; readonly verdict: string; readonly rows: number; readonly kept: number; readonly windowCls: string | null; readonly recency: string; readonly cannot: { metric: string; because: string }[]; readonly nextData: string[] }
export async function imports(): Promise<ImportRow[]> {
  if (!runtimeConfigured()) return [];
  const { db } = await getRuntime();
  const rows = (await db.query<{ id: number; filename: string; sha256: string; imported_at: string; period_from: string | null; period_to: string | null; verdict: string; result: unknown }>(`select id, filename, sha256, imported_at, period_from, period_to, verdict, result from pms_imports where property_id = $1 order by imported_at desc, id desc`, [propertyId()])).rows;
  return rows.map((r) => { const res = (typeof r.result === "string" ? JSON.parse(r.result) : r.result) as { counts: { rows: number; kept: number }; sufficiency: { window: { cls: string | null }; cannotCompute: { metric: string; because: string }[]; nextData: string[] }; recency: { statement: string } }; return { id: Number(r.id), filename: r.filename, sha256: r.sha256, importedAt: new Date(r.imported_at).toISOString(), periodFrom: r.period_from ? String(r.period_from).slice(0, 10) : null, periodTo: r.period_to ? String(r.period_to).slice(0, 10) : null, verdict: r.verdict, rows: res.counts.rows, kept: res.counts.kept, windowCls: res.sufficiency.window?.cls ?? null, recency: res.recency?.statement ?? "", cannot: res.sufficiency.cannotCompute, nextData: res.sufficiency.nextData }; });
}
export async function contracts(): Promise<InterventionContract[]> {
  if (!runtimeConfigured()) return [];
  const { rt, db } = await getRuntime(); const list = await rt.listInterventions(db, propertyId());
  const out: InterventionContract[] = []; for (const l of list) { const c = await rt.loadIntervention(db, l.id); if (c) out.push(c); } return out;
}
export async function contract(id: string): Promise<{ contract: InterventionContract; closure: string[] } | null> {
  if (!runtimeConfigured()) return null;
  const { rt, db } = await getRuntime(); const c = await rt.loadIntervention(db, id); if (!c || c.propertyId !== propertyId()) return null;
  return { contract: c, closure: [...closureDossier(c).body] };
}
export async function health(): Promise<{ ok: boolean; problems: string[]; properties: { id: string; cycles: number; lastCycleAt: string | null }[]; backend: string } | null> {
  if (!runtimeConfigured()) return null;
  const { rt, db } = await getRuntime(); const h = await rt.health(db); return { ok: h.ok, problems: h.problems, properties: h.properties, backend: h.backend };
}
export async function properties(): Promise<{ id: string; name: string; simulated: boolean; cycles: number; lastCycleAt: string | null }[]> {
  if (!runtimeConfigured()) return [{ id: COUNTRY_HOUSE_34.id, name: COUNTRY_HOUSE_34.name, simulated: true, cycles: 0, lastCycleAt: null }];
  const { rt, db } = await getRuntime(); const list = await rt.listProperties(db); const h = await rt.health(db);
  return list.map((p) => { const hp = h.properties.find((x) => x.id === p.id); return { ...p, cycles: hp?.cycles ?? 0, lastCycleAt: hp?.lastCycleAt ?? null }; });
}
export const alertsOf = (r: CycleResult) => r.events.filter((e) => e.state === "ALERT");
