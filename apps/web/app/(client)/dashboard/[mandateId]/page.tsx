import Link from "next/link";
import { notFound } from "next/navigation";
import { getClientDashboard } from "@/lib/cockpit-data";
import { poundsFromPence, pct, FORMULA_LABEL } from "@/lib/format";

export async function generateMetadata({ params }: { params: Promise<{ mandateId: string }> }) {
  const { mandateId } = await params;
  const d = await getClientDashboard(mandateId);
  return { title: d ? `${d.propertyName} — Anesis dashboard` : "Anesis dashboard" };
}

/**
 * Dashboard client — un seul établissement. Rend des données de démonstration tant que la base n'est
 * pas fournie ; la forme est celle de @anesis/readmodel (clientDashboard via withMandate, isolé par RLS).
 */
export default async function DashboardPage({ params }: { params: Promise<{ mandateId: string }> }) {
  const { mandateId } = await params;
  const d = await getClientDashboard(mandateId);
  if (!d) notFound();

  const t = d.commercialTerms;

  return (
    <main className="mx-auto max-w-5xl px-6 py-16 text-forest-900">
      <Link href="/cockpit" className="link-underline text-sm">← Cockpit</Link>

      <div className="mt-6 flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="eyebrow">{d.region}</p>
          <h1 className="mt-2 font-serif text-4xl font-light">{d.propertyName}</h1>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wide text-forest-800/60">Anesis Revenue Leak Index™</p>
          <p className="font-serif text-5xl font-light text-gold-deep">{d.leakIndex ?? "—"}</p>
        </div>
      </div>

      {d.demo && (
        <p className="mt-4 rounded-lg border border-gold/30 bg-gold/5 px-4 py-3 text-sm text-forest-800/80">
          Illustrative data — a fictional establishment. Figures are measured, never assumed, on live mandates.
        </p>
      )}

      <section className="mt-10 grid gap-5 md:grid-cols-2">
        <div className="rounded-xl border border-forest-900/12 bg-cream-100/60 p-6">
          <p className="text-xs uppercase tracking-wide text-forest-800/60">Recoverable, per year (priced)</p>
          <p className="mt-2 font-serif text-4xl font-light">{poundsFromPence(d.recoverableAnnualPence)}</p>
          <p className="mt-2 text-sm text-forest-800/70">Sum of the priced leak across the pillars below.</p>
        </div>

        <div className="rounded-xl border border-forest-900/12 p-6">
          <p className="text-xs uppercase tracking-wide text-forest-800/60">Proposed terms</p>
          {t ? (
            <dl className="mt-3 space-y-1.5 text-sm">
              <Row k="Formula" v={FORMULA_LABEL[t.formula]} />
              <Row k="Term" v={`${t.termMonths} months`} />
              <Row k="Incentive (end of term)" v={pct(t.incentiveRate)} />
              <Row k="Monthly" v={poundsFromPence(t.monthlySubscriptionPence)} />
              <Row k="Photo/video sessions" v={String(t.photoSessions)} />
            </dl>
          ) : (
            <p className="mt-3 text-sm text-forest-800/60">Terms not yet set — proposed at the contract step.</p>
          )}
          <p className="mt-4 text-xs text-forest-800/55">
            Conditional; applicable from official UK installation. The incentive rate follows the term, not the formula.
          </p>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-serif text-2xl font-light">Where the money leaks</h2>
        <ul className="mt-4 divide-y divide-forest-900/10 rounded-xl border border-forest-900/12">
          {d.lossLines.map((l, i) => (
            <li key={i} className="flex items-center justify-between gap-4 px-5 py-4">
              <div>
                <p className="font-medium capitalize">{l.pillar.replace(/_/g, " ")}</p>
                <p className="text-sm text-forest-800/70">{l.rootCause}</p>
              </div>
              <p className="whitespace-nowrap font-serif text-lg">{poundsFromPence(l.annualLossPence)}<span className="text-xs text-forest-800/55">/yr</span></p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12 grid gap-8 md:grid-cols-2">
        <div>
          <h2 className="font-serif text-2xl font-light">Objectives</h2>
          <ul className="mt-4 space-y-3">
            {d.objectives.map((o) => (
              <li key={o.id} className="rounded-lg border border-forest-900/12 px-4 py-3 text-sm">
                <p className="text-forest-800/85">{o.title}</p>
                <p className="mt-1 text-xs text-gold-deep">Target recovery {poundsFromPence(o.targetRecoveryPence)}/yr</p>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="font-serif text-2xl font-light">Who is on it</h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {d.tasksByAgent.map((a) => (
              <li key={a.agent} className="rounded-full border border-forest-900/15 px-4 py-2 text-sm">
                <span className="capitalize">{a.agent.replace(/-/g, " ")}</span>
                <span className="ml-2 text-forest-800/55">{a.count}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-forest-800/60">{k}</dt>
      <dd className="font-medium">{v}</dd>
    </div>
  );
}
