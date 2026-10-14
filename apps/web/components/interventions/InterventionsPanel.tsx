"use client";
import { useEffect, useState } from "react";

type Row = { id: string; state: string; version: number; interventionId: string; runId: string };
type Detail = { contract: { id: string; state: string; decisionStatus: string; approvalLevel: number; estimatedBudget: { amountGbp: number | null; status: string }; approvedCost: { amountGbp: number | null; status: string }; budgetStatus: string; objective: string; priorityReason: string; evidence: { unknown: string[] }; dataRequest: { missing: string[] } | null; deliverables: { kind: string; title: string; body: string[] }[]; execution: { proofs: { kind: string; reference: string; by: string; recordedAt: string }[]; actualSpend: { amountGbp: number | null; status: string }; executedAt: string | null; measured: { observedChange: number | null; postWeeks: number; windowWeeks: number; incrementality: string; note: string } | null }; history: { seq: number; at: string; by: string; from: string | null; to: string; note: string }[] }; closure: { body: string[] } };

/** Minimal operator panel: read a contract, authorise with an amount, start, declare executed with proofs and cost, measure, close. Every action is a governed transition recorded under the session operator. */
export function InterventionsPanel() {
  const [rows, setRows] = useState<Row[] | null>(null); const [err, setErr] = useState<string | null>(null); const [sel, setSel] = useState<Detail | null>(null); const [busy, setBusy] = useState(false);
  const load = async () => { const r = await fetch("/api/interventions"); if (!r.ok) { setErr((await r.json()).error ?? `HTTP ${r.status}`); return; } setRows((await r.json()).interventions); };
  useEffect(() => { void load(); }, []);
  const open = async (id: string) => { const r = await fetch(`/api/interventions/${id}`); if (r.ok) setSel(await r.json()); else setErr((await r.json()).error); };
  const act = async (id: string, body: Record<string, unknown>) => {
    setBusy(true); setErr(null);
    const r = await fetch(`/api/interventions/${id}/transition`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json(); if (!r.ok) setErr(j.error ?? `HTTP ${r.status}`); await load(); await open(id); setBusy(false);
  };
  const ask = (q: string, d = "") => window.prompt(q, d);
  const c = sel?.contract;
  return (
    <main className="mx-auto max-w-6xl px-6 py-12 text-forest-900">
      <h1 className="font-serif text-3xl">Interventions</h1>
      <p className="mt-2 text-sm text-forest-800/70">Contracts prepared by the engine for this property. Nothing here is sent anywhere: an authorisation commits a budget, an execution is declared by a human with a checkable proof, a measurement is an observed change on the property's own history.</p>
      {err && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800" data-testid="error">{err}</p>}
      <div className="mt-6 grid gap-6 md:grid-cols-[320px_1fr]">
        <ul className="space-y-1 text-sm" data-testid="list">
          {rows === null && <li>Loading…</li>}{rows?.length === 0 && <li>No contract yet: run a cycle first.</li>}
          {rows?.map((r) => <li key={r.id}><button className={`w-full rounded-md px-3 py-2 text-left hover:bg-forest-900/5 ${c?.id === r.id ? "bg-forest-900/10" : ""}`} onClick={() => open(r.id)}><span className="font-mono text-xs">{r.id}</span> <span className="ml-2 rounded bg-forest-900/10 px-1.5 text-xs">{r.state}</span></button></li>)}
        </ul>
        {c && <section className="rounded-xl border border-forest-900/10 p-5 text-sm" data-testid="detail">
          <h2 className="font-serif text-xl">{c.id} <span className="ml-2 rounded bg-forest-900/10 px-2 text-xs">{c.state}</span></h2>
          <p className="mt-1 text-forest-800/80">{c.objective} — decision {c.decisionStatus}, approval L{c.approvalLevel}, budget {c.budgetStatus}; estimate {c.estimatedBudget.amountGbp === null ? "UNKNOWN" : `£${c.estimatedBudget.amountGbp.toLocaleString("en-GB")}`}; approved {c.approvedCost.amountGbp === null ? c.approvedCost.status : `£${c.approvedCost.amountGbp.toLocaleString("en-GB")}`}.</p>
          <p className="mt-2">{c.priorityReason}</p>
          {c.dataRequest && <p className="mt-2 rounded-md bg-amber-50 px-3 py-2">Data request open — missing: {c.dataRequest.missing.join("; ")}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            {c.state === "PREPARED" && <button disabled={busy} className="btn-ghost" onClick={() => act(c.id, { to: "SUBMITTED" })}>Submit for decision</button>}
            {c.state === "SUBMITTED" && <button disabled={busy} className="btn-ghost" onClick={() => { const a = ask("Approved amount in GBP (the estimate if left as is)", c.estimatedBudget.amountGbp === null ? "" : String(c.estimatedBudget.amountGbp)); if (a === null) return; void act(c.id, { to: "AUTHORISED", approvedAmountGbp: a === "" ? undefined : Number(a), note: ask("Note") ?? "" }); }}>Authorise</button>}
            {c.state === "SUBMITTED" && <button disabled={busy} className="btn-ghost" onClick={() => act(c.id, { to: "REJECTED", note: ask("Why?") ?? "" })}>Reject</button>}
            {c.state === "AUTHORISED" && <button disabled={busy} className="btn-ghost" onClick={() => act(c.id, { to: "IN_EXECUTION" })}>Start execution</button>}
            {c.state === "IN_EXECUTION" && <button disabled={busy} className="btn-ghost" onClick={() => { const ref = ask("Proof reference (ticket id, deployment URL, invoice number…)"); if (!ref) return; const kind = ask("Proof kind: ticket | deployment | screenshot | invoice | statement | report | other", "ticket") ?? "other"; const spend = ask("Actual spend in GBP (leave empty if not known yet)", ""); void act(c.id, { to: "EXECUTED", proofs: [{ kind, reference: ref, note: "" }], actualSpendGbp: spend === "" || spend === null ? null : Number(spend) }); }}>Declare executed</button>}
            {c.state === "EXECUTED" && <button disabled={busy} className="btn-ghost" onClick={() => { const w = ask("Observation window in weeks", "8"); if (!w) return; void act(c.id, { to: "MEASURED", windowWeeks: Number(w) }); }}>Measure on the property's history</button>}
            {(c.state === "EXECUTED" || c.state === "MEASURED") && <button disabled={busy} className="btn-ghost" onClick={() => act(c.id, { to: "CLOSED" })}>Close</button>}
            {["PREPARED", "SUBMITTED", "AUTHORISED", "IN_EXECUTION"].includes(c.state) && <button disabled={busy} className="btn-ghost" onClick={() => act(c.id, { to: "WITHDRAWN", note: ask("Why?") ?? "" })}>Withdraw</button>}
          </div>
          {c.execution.proofs.length > 0 && <p className="mt-4"><span className="font-medium">Proofs:</span> {c.execution.proofs.map((p) => `${p.kind} ${p.reference} (${p.by}, ${p.recordedAt.slice(0, 10)})`).join("; ")}; actual spend {c.execution.actualSpend.amountGbp === null ? c.execution.actualSpend.status : `£${c.execution.actualSpend.amountGbp.toLocaleString("en-GB")}`}</p>}
          {c.execution.measured && <p className="mt-2"><span className="font-medium">Result:</span> observed change {c.execution.measured.observedChange === null ? "unknown" : `£${Math.round(c.execution.measured.observedChange).toLocaleString("en-GB")}/week`} over {c.execution.measured.postWeeks}/{c.execution.measured.windowWeeks} weeks — {c.execution.measured.incrementality}. {c.execution.measured.note}</p>}
          <details className="mt-4"><summary className="cursor-pointer">Deliverables ({c.deliverables.length})</summary>{c.deliverables.map((d) => <div key={d.kind} className="mt-2"><p className="font-medium">{d.title}</p><pre className="whitespace-pre-wrap text-xs text-forest-800/80">{d.body.join("\n")}</pre></div>)}</details>
          <details className="mt-2"><summary className="cursor-pointer">History ({c.history.length})</summary><ol className="mt-2 list-decimal pl-5 text-xs">{c.history.map((h) => <li key={h.seq}>{h.at} {h.from ?? "—"} → {h.to} by {h.by}: {h.note}</li>)}</ol></details>
        </section>}
      </div>
    </main>
  );
}
