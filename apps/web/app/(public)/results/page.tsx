import { PageHeader } from "@/components/site/PageHeader";
import { Reveal } from "@/components/Reveal";
import { TrajectoryChartLazy } from "@/components/TrajectoryChartLazy";

export const metadata = { title: "Results" };

export default function ResultsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Track record · North America"
        title="What the method has returned, before its first UK mandate."
        lede="Our founder’s record was built in North America. We show it clearly labelled, and we don’t borrow it to imply UK results we haven’t earned yet."
      />

      {/* Trajectoire : ligne de base vs réel obtenu (mécanisme d'intéressement, Partie 4). */}
      <section className="border-b border-gold/15 py-24 md:py-32">
        <div className="container-editorial">
          <Reveal className="max-w-2xl">
            <p className="eyebrow">The mechanism, drawn</p>
            <h2 className="mt-5 font-serif text-4xl font-light text-forest-900 md:text-5xl">
              We are paid on the distance between these two lines.
            </h2>
            <p className="mt-6 max-w-prose font-sans text-base leading-relaxed text-forest-800/85">
              The flat line is what the direct channel would have done, left alone. The rising one is what
              it did once recovered. Our reward is tied to the gap — never to how much you spend.
            </p>
          </Reveal>

          <Reveal index={1} className="mt-12 rounded-2xl border border-forest-900/12 bg-cream-100/70 p-6 md:p-10">
            <TrajectoryChartLazy />
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-6 font-sans text-xs text-forest-800/70">
                <span className="flex items-center gap-2"><span className="inline-block h-px w-6 border-t border-dashed border-[#9AA79B]" /> Baseline</span>
                <span className="flex items-center gap-2"><span className="inline-block h-0.5 w-6 bg-gold" /> With Anesis</span>
              </div>
              <p className="eyebrow">Illustrative · sample trajectory</p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Cas nord-américains, clairement étiquetés. */}
      <section className="py-24 md:py-32">
        <div className="container-editorial">
          <Reveal className="max-w-2xl">
            <p className="eyebrow">Selected engagements · North America</p>
            <h2 className="mt-5 font-serif text-4xl font-light text-forest-900 md:text-5xl">
              Figures earned elsewhere, shown honestly.
            </h2>
          </Reveal>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {CASES.map((c, i) => (
              <Reveal key={c.figure} index={i}>
                <figure className="h-full rounded-2xl border border-forest-900/12 bg-cream-50 p-8">
                  <figcaption className="eyebrow">{c.label}</figcaption>
                  <p className="mt-4 font-serif text-5xl font-light text-forest-900">{c.figure}</p>
                  <p className="mt-3 font-sans text-sm leading-relaxed text-forest-800/80">{c.body}</p>
                </figure>
              </Reveal>
            ))}
          </div>

          <p className="mt-10 max-w-prose font-sans text-xs leading-relaxed text-forest-800/55">
            All figures relate to engagements in North America and are shown for context only. They do not
            represent, and should not be read as, results for any United Kingdom hotel.
          </p>
        </div>
      </section>
    </>
  );
}

const CASES = [
  {
    label: "Boutique group · 3 properties",
    figure: "+£118k",
    body: "Annual direct-booking revenue recovered across the group, once the channel mix was rebalanced away from the platforms.",
  },
  {
    label: "Country inn · 24 keys",
    figure: "31%",
    body: "Share of bookings shifted back to the direct channel over two seasons, without an increase in advertising spend.",
  },
  {
    label: "Coastal hotel · 40 keys",
    figure: "4.6★",
    body: "Average review rating held, with reply times cut to under two hours across the season — reputation as a booking driver, not an afterthought.",
  },
];
