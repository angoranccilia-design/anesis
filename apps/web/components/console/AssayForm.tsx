"use client";
import { useState } from "react";
/** G. Launch an analysis: a reservations export (CSV/XLSX), the room count, the export date. The server imports it, runs one cycle and comes back with the run id. */
export function AssayForm({ demo }: { demo: boolean }) {
  const [busy, setBusy] = useState(false); const [out, setOut] = useState<{ runId?: string; verdict?: string; window?: string; error?: string; summary?: Record<string, unknown> } | null>(null);
  const submit = async (e: React.FormEvent<HTMLFormElement>) => { e.preventDefault(); setBusy(true); setOut(null); const fd = new FormData(e.currentTarget); const r = await fetch("/api/assay", { method: "POST", body: fd }); setOut(await r.json()); setBusy(false); };
  return (
    <form onSubmit={submit} className="rounded-2xl border border-forest-900/10 bg-white/70 p-6">
      <div className="grid gap-4 md:grid-cols-3">
        <label className="text-sm"><span className="eyebrow">Reservations export</span><input name="file" type="file" accept=".csv,.xlsx,.xls" className="mt-1 block w-full text-xs" /><span className="mt-1 block text-xs text-forest-800/60">CSV or XLSX, one row per reservation. Leave empty to re-run on the latest import.</span></label>
        <label className="text-sm"><span className="eyebrow">Sellable rooms</span><input name="rooms" type="number" min={1} defaultValue={40} className="mt-1 block w-full rounded-lg border border-forest-900/20 bg-cream-50 px-3 py-2" /></label>
        <label className="text-sm"><span className="eyebrow">Export produced on</span><input name="collectedAt" type="date" className="mt-1 block w-full rounded-lg border border-forest-900/20 bg-cream-50 px-3 py-2" /><span className="mt-1 block text-xs text-forest-800/60">Optional. Kept apart from the period end and the import date.</span></label>
      </div>
      <div className="mt-4 flex items-center gap-3"><button disabled={busy} className="btn-primary">{busy ? "Importing and running the cycle…" : "Run the assay"}</button><span className="text-xs text-forest-800/60">{demo ? "Demo: the file goes through the real reader and the real engine; nothing is stored beyond this session." : "The import, the cycle and the contracts are persisted."}</span></div>
      {out?.error && <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">{out.error}</p>}
      {out?.runId && <div className="mt-4 rounded-xl border border-gold/40 bg-gold/10 p-4 text-sm"><p><strong>Cycle {out.runId} completed.</strong> Import verdict: {out.verdict} · {out.window}</p><pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap text-xs">{JSON.stringify(out.summary, null, 2)}</pre><p className="mt-2"><a className="link-underline" href={`/console/constraint?run=${out.runId}`}>Open the Commercial Constraint for this cycle →</a> · <a className="link-underline" href={`/console/decision?run=${out.runId}`}>Decision →</a> · <a className="link-underline" href="/console/interventions">Contracts →</a></p></div>}
    </form>
  );
}
