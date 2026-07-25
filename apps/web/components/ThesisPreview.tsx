import Image from "next/image";

/**
 * Aperçu de la Thèse d'Acquisition (brief §2) — mockup du LIVRABLE réel (score, postes de perte par
 * pilier, plan 90 jours), données d'ÉCHANTILLON clairement marquées. Feuillet de rapport premium.
 * Reflète la structure réelle (packages/assessment + packages/planning). Aucun mot « AI ».
 */
const LOSS_LINES = [
  { pillar: "Slow site response", pence: 2100, pct: 28 },
  { pillar: "OTA over-dependence", pence: 2600, pct: 35 },
  { pillar: "Absent retargeting", pence: 1800, pct: 24 },
  { pillar: "Thin review presence", pence: 900, pct: 13 },
];

export function ThesisPreview() {
  return (
    <div className="mx-auto w-full max-w-xl rounded-sm border border-forest-900/15 bg-cream-50 p-8 shadow-[0_20px_60px_-30px_rgba(18,42,29,0.45)] md:p-10">
      <div className="flex items-start justify-between border-b border-forest-900/12 pb-5">
        <div>
          <p className="eyebrow">Acquisition Thesis · sample</p>
          <p className="mt-2 font-serif text-2xl font-light text-forest-900">Ashcombe House</p>
          <p className="font-sans text-sm text-forest-800/70">Somerset · 28 keys</p>
        </div>
        <Image src="/crest.jpg" alt="" width={120} height={98} className="h-auto w-14 mix-blend-multiply" />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-forest-900/12 bg-cream-100 p-4">
          <p className="eyebrow">Anesis Revenue Leak Index™</p>
          <p className="mt-1 font-serif text-4xl font-light text-forest-900">68<span className="text-xl text-forest-800/50">/100</span></p>
        </div>
        <div className="rounded-lg border border-gold/30 bg-cream-100 p-4">
          <p className="eyebrow">Recoverable</p>
          <p className="mt-1 font-serif text-4xl font-light text-forest-900">£7,400<span className="text-base text-forest-800/50"> /mo</span></p>
        </div>
      </div>

      <div className="mt-6">
        <p className="eyebrow">Where the loss sits</p>
        <div className="mt-3 space-y-3">
          {LOSS_LINES.map((l) => (
            <div key={l.pillar}>
              <div className="flex items-baseline justify-between font-sans text-sm">
                <span className="text-forest-800/85">{l.pillar}</span>
                <span className="font-serif text-forest-900">£{l.pence}/mo</span>
              </div>
              <div className="mt-1.5 h-1 w-full rounded-full bg-cream-300">
                <div className="h-1 rounded-full bg-gold" style={{ width: `${l.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 border-t border-forest-900/12 pt-5">
        <p className="eyebrow">Ninety-day plan</p>
        <ol className="mt-3 space-y-2 font-sans text-sm text-forest-800/85">
          <li><span className="font-serif text-gold-deep">01 —</span> Recover the direct booking path; cut response time under one second.</li>
          <li><span className="font-serif text-gold-deep">02 —</span> Rebalance channel mix; protect rate parity against the platforms.</li>
          <li><span className="font-serif text-gold-deep">03 —</span> Reinstate retargeting to recapture warm, unmet demand.</li>
        </ol>
      </div>

      <p className="mt-6 font-sans text-xs text-forest-800/55">
        Illustrative sample. A real thesis is prepared from your own data, and the figures are measured,
        not assumed.
      </p>
    </div>
  );
}
