import type { ReactNode } from "react";
/** Shared console pieces: cards, labels, status pills, money. Deep green, discreet gold, serif titles. */
export const gbp = (x: number | null | undefined) => (x === null || x === undefined || Number.isNaN(x) ? "—" : `£${Math.round(x).toLocaleString("en-GB")}`);
export const pct = (x: number | null | undefined, d = 0) => (x === null || x === undefined || Number.isNaN(x) ? "—" : `${(x * 100).toFixed(d)} %`);
export const when = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/London" }) : "—");
export function Card({ title, eyebrow, children, className = "", right }: { title?: string; eyebrow?: string; children: ReactNode; className?: string; right?: ReactNode }) {
  return <section className={`rounded-2xl border border-forest-900/10 bg-white/70 p-5 shadow-[0_1px_0_rgba(14,31,22,0.04)] ${className}`}>{(title || eyebrow) && <header className="mb-3 flex items-baseline justify-between gap-4">{eyebrow && <p className="eyebrow">{eyebrow}</p>}{title && <h2 className="font-serif text-2xl">{title}</h2>}{right}</header>}{children}</section>;
}
export function Stat({ label, value, note, tone = "default" }: { label: string; value: ReactNode; note?: ReactNode; tone?: "default" | "gold" | "warn" | "muted" }) {
  const v = tone === "gold" ? "text-gold-deep" : tone === "warn" ? "text-amber-800" : tone === "muted" ? "text-forest-800/50" : "text-forest-950";
  return <div className="rounded-xl border border-forest-900/10 bg-cream-50 px-4 py-3"><p className="eyebrow">{label}</p><p className={`mt-1 font-serif text-2xl ${v}`}>{value}</p>{note && <p className="mt-1 text-xs text-forest-800/70">{note}</p>}</div>;
}
const TONE: Record<string, string> = {
  CONNECTED: "bg-forest-700 text-cream-50", OPERATOR_ENTERED: "bg-gold/20 text-gold-deep", AUTHENTICATION_REQUIRED: "bg-cream-200 text-forest-800/70", NOT_CONNECTED: "bg-cream-200 text-forest-800/70", DATA_UNAVAILABLE: "bg-amber-100 text-amber-900", SOURCE_NOT_CONFIGURED: "bg-cream-200 text-forest-800/70", STALE: "bg-amber-100 text-amber-900", PARTIAL: "bg-amber-100 text-amber-900",
  VERIFIED: "bg-forest-700 text-cream-50", MODELLED: "bg-gold/20 text-gold-deep", SIMULATED: "bg-cream-200 text-forest-800/60", BENCHMARK: "bg-cream-200 text-forest-800/70", EXPERIMENTAL: "bg-cream-200 text-forest-800/70",
  FUNDED: "bg-forest-700 text-cream-50", INVESTIGATE: "bg-gold/20 text-gold-deep", BLOCKED: "bg-amber-100 text-amber-900", REJECTED: "bg-cream-200 text-forest-800/60", DEFERRED: "bg-cream-200 text-forest-800/70", IN_PROGRESS: "bg-forest-500 text-cream-50",
  PREPARED: "bg-cream-200 text-forest-800/80", SUBMITTED: "bg-gold/20 text-gold-deep", AUTHORISED: "bg-forest-600 text-cream-50", IN_EXECUTION: "bg-forest-700 text-cream-50", EXECUTED: "bg-forest-800 text-cream-50", MEASURED: "bg-forest-900 text-cream-50", CLOSED: "bg-forest-950 text-gold-light", WITHDRAWN: "bg-cream-200 text-forest-800/60",
  ALERT: "bg-amber-100 text-amber-900", ok: "bg-forest-700 text-cream-50", problem: "bg-amber-100 text-amber-900",
};
export function Pill({ v, title }: { v: string; title?: string }) { return <span title={title} className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium tracking-wide ${TONE[v] ?? "bg-cream-200 text-forest-800/80"}`}>{v.replace(/_/g, " ")}</span>; }
export function Bar({ value, max = 1 }: { value: number; max?: number }) { const w = Math.max(0, Math.min(1, value / max)); return <div className="h-1.5 w-full rounded-full bg-forest-900/10"><div className="h-1.5 rounded-full bg-gradient-to-r from-forest-700 to-gold" style={{ width: `${w * 100}%` }} /></div>; }
export function Empty({ children }: { children: ReactNode }) { return <p className="rounded-xl border border-dashed border-forest-900/20 px-4 py-6 text-center text-sm text-forest-800/60">{children}</p>; }
export function DemoBanner({ demo, simulated }: { demo: boolean; simulated: boolean }) {
  if (!demo && !simulated) return null;
  return <p className="mb-6 rounded-xl border border-gold/40 bg-gold/10 px-4 py-2 text-sm text-forest-900">{demo ? <><strong>Demonstration.</strong> Harbourline House is a synthetic establishment with a synthetic reservations export, pushed through the real pipeline under the verified-only evidence policy. Nothing here comes from a real hotel.</> : <><strong>Simulated property.</strong> The built-in simulated property runs on simulated evidence and is labelled as such.</>}</p>;
}
