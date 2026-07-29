import Link from "next/link";
import { getCockpitOverview } from "@/lib/cockpit-data";
import { poundsFromPence, pct, FORMULA_LABEL } from "@/lib/format";
import { decideApprovalAction } from "./actions";

export const metadata = { title: "Founder cockpit — Anesis Acquisition" };
export const dynamic = "force-dynamic"; // lecture par requête (session + données vivantes quand DB présente)

/**
 * Cockpit fondatrice — lecture transversale de tous les mandats. Rend des données de démonstration
 * (établissements fictifs) tant que la base n'est pas fournie ; la forme est celle de @anesis/readmodel
 * (withFounder). Aucune donnée réelle, aucun mandat payant exécuté avant le visa.
 */
export default async function CockpitPage() {
  const o = await getCockpitOverview();

  return (
    <main className="mx-auto max-w-6xl px-6 py-16 text-forest-900">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Founder cockpit</p>
          <h1 className="mt-2 font-serif text-4xl font-light">The pipeline, end to end.</h1>
        </div>
        <button
          type="button"
          disabled
          title="Global emergency stop is founder-only and wired to the policy engine; enabled once the database is connected."
          className="rounded-full border border-red-800/40 px-5 py-2 text-sm text-red-800/70"
        >
          Emergency stop (all mandates)
        </button>
      </div>

      {o.demo && (
        <p className="mt-4 rounded-lg border border-gold/30 bg-gold/5 px-4 py-3 text-sm text-forest-800/80">
          Illustrative data — fictional establishments. No live mandate is billed before UK installation.
        </p>
      )}

      {/* Totals */}
      <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Mandates" value={String(o.totals.mandates)} />
        <Stat label="Projected monthly recurring" value={poundsFromPence(o.totals.monthlyRecurringPence)} />
        <Stat label="Human minutes (to date)" value={String(o.totals.humanMinutes)} />
        <Stat label="Approvals awaiting you" value={String(o.totals.pendingApprovals)} accent={o.totals.pendingApprovals > 0} />
      </section>

      {/* Pending approvals */}
      <section className="mt-14">
        <h2 className="font-serif text-2xl font-light">Awaiting your decision</h2>
        {o.pendingApprovals.length === 0 ? (
          <p className="mt-3 text-sm text-forest-800/70">Nothing to approve right now.</p>
        ) : (
          <ul className="mt-4 divide-y divide-forest-900/10 rounded-xl border border-forest-900/12">
            {o.pendingApprovals.map((a) => (
              <li key={a.approvalId} className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
                <div>
                  <p className="font-medium">{a.propertyName}</p>
                  <p className="text-sm text-forest-800/70">
                    <span className="font-mono">{a.toolCallName}</span> · {a.tier}
                    {a.amountPence != null && <> · {poundsFromPence(a.amountPence)}</>}
                    {a.decidedBy && <> · decided by {a.decidedBy}</>}
                  </p>
                </div>
                {o.demo ? (
                  <span
                    className="rounded-full bg-forest-900/5 px-4 py-2 text-xs text-forest-800/60"
                    title="The grant is recorded at the approval step (canApproveTier + delegation); enabled once auth + database are connected."
                  >
                    Approve / Decline — at sign-in
                  </span>
                ) : (
                  <div className="flex gap-2">
                    <form action={decideApprovalAction}>
                      <input type="hidden" name="mandateId" value={a.mandateId} />
                      <input type="hidden" name="approvalId" value={a.approvalId} />
                      <input type="hidden" name="decision" value="grant" />
                      <button type="submit" className="rounded-full bg-forest-900 px-4 py-2 text-xs text-cream-50 hover:bg-forest-800">
                        Approve
                      </button>
                    </form>
                    <form action={decideApprovalAction}>
                      <input type="hidden" name="mandateId" value={a.mandateId} />
                      <input type="hidden" name="approvalId" value={a.approvalId} />
                      <input type="hidden" name="decision" value="deny" />
                      <button type="submit" className="rounded-full border border-forest-900/25 px-4 py-2 text-xs hover:bg-forest-900/5">
                        Decline
                      </button>
                    </form>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Pipeline */}
      <section className="mt-14">
        <h2 className="font-serif text-2xl font-light">Mandates</h2>
        <div className="mt-4 overflow-x-auto rounded-xl border border-forest-900/12">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-forest-900/[0.03] text-xs uppercase tracking-wide text-forest-800/60">
              <tr>
                <Th>Establishment</Th>
                <Th>Leak Index</Th>
                <Th>Terms</Th>
                <Th>Incentive</Th>
                <Th>Objectives</Th>
                <Th>Tasks</Th>
                <Th>Human min.</Th>
                <Th>Approvals</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-forest-900/8">
              {o.mandates.map((m) => (
                <tr key={m.mandateId} className="hover:bg-cream-100/50">
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/${m.mandateId}`} className="font-medium link-underline">
                      {m.propertyName}
                    </Link>
                    <span className="block text-xs text-forest-800/60">{m.region}</span>
                  </td>
                  <td className="px-4 py-3">{m.leakIndex ?? "—"}</td>
                  <td className="px-4 py-3">
                    {m.formula ? `${FORMULA_LABEL[m.formula]} · ${m.termMonths}m` : <span className="text-forest-800/50">not set</span>}
                  </td>
                  <td className="px-4 py-3">{m.incentiveRate != null ? pct(m.incentiveRate) : "—"}</td>
                  <td className="px-4 py-3">{m.objectivesCount}</td>
                  <td className="px-4 py-3">{m.tasksCount}</td>
                  <td className="px-4 py-3">{m.humanMinutes}</td>
                  <td className="px-4 py-3">{m.pendingApprovals > 0 ? <span className="text-gold-deep">{m.pendingApprovals}</span> : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-forest-900/12 bg-cream-100/60 p-5">
      <p className="text-xs uppercase tracking-wide text-forest-800/60">{label}</p>
      <p className={`mt-2 font-serif text-3xl font-light ${accent ? "text-gold-deep" : "text-forest-900"}`}>{value}</p>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 font-medium">{children}</th>;
}
