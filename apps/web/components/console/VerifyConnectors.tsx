"use client";
import { useState } from "react";
/** Calls every live connector now, for real, and shows what came back. */
export function VerifyConnectors() {
  const [rows, setRows] = useState<{ id: string; status: string; note: string; ms: number }[] | null>(null); const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  const go = async () => { setBusy(true); setErr(null); const r = await fetch("/api/engine/connectors/verify", { method: "POST" }); if (!r.ok) setErr((await r.json()).error ?? `HTTP ${r.status}`); else setRows((await r.json()).results); setBusy(false); };
  return <div className="text-right"><button onClick={go} disabled={busy} className="btn-ghost">{busy ? "Calling the sources…" : "Call every live source now"}</button>{err && <p className="mt-1 text-xs text-amber-900">{err}</p>}{rows && <ul className="mt-2 text-left text-xs">{rows.map((x) => <li key={x.id}><span className="font-mono">{x.id}</span> <strong>{x.status}</strong> ({x.ms} ms) — {x.note}</li>)}</ul>}</div>;
}
