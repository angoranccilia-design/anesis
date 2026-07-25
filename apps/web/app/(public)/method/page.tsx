import { PageHeader } from "@/components/site/PageHeader";
import { Reveal } from "@/components/Reveal";
import { LeakAuditWidget } from "@/components/LeakAuditWidget";
import { ThesisPreview } from "@/components/ThesisPreview";
import { DifferentiationToggle } from "@/components/DifferentiationToggle";

export const metadata = { title: "Method" };

const PILLARS = [
  { n: "01", name: "Response", measure: "How quickly your site answers, and how cleanly it leads to a direct booking.", leak: "A second’s hesitation, and a guest who found you on Instagram books you on Booking.com instead." },
  { n: "02", name: "Reputation", measure: "The volume and rating of your reviews, and how promptly they’re answered.", leak: "A reply sent six hours late reads as indifference — and indifference doesn’t convert." },
  { n: "03", name: "Distribution", measure: "How much of your demand runs through the platforms, and whether your own rate holds.", leak: "Every over-reliant booking pays a commission to introduce you to a guest who was already yours." },
  { n: "04", name: "Recapture", measure: "Whether warm, unconverted demand is ever invited back.", leak: "Without retargeting, the guest who nearly booked simply drifts — and is never asked again." },
  { n: "05", name: "Presence", measure: "Whether your social presence works as a booking driver, consistent and current — not vanity.", leak: "A feed that looks abandoned quietly suggests the rooms might be too — and the direct booking never starts." },
];

export default function MethodPage() {
  return (
    <>
      <PageHeader
        eyebrow="The method"
        title="How we measure the leak — and how we close it."
        lede="Five pillars, one figure in pounds, then a plan. The Anesis Revenue Leak Index™ is grounded in your real data, never in a form you fill in yourself."
      />

      {/* Les quatre piliers. */}
      <section className="border-b border-gold/15 py-24 md:py-32">
        <div className="container-editorial">
          <Reveal className="max-w-2xl">
            <p className="eyebrow">Four places the money leaks</p>
            <h2 className="mt-5 font-serif text-4xl font-light text-forest-900 md:text-5xl">
              The Revenue Leak Index reads five things a marketer rarely priced.
            </h2>
          </Reveal>
          <div className="mt-14 grid gap-x-12 gap-y-10 md:grid-cols-2">
            {PILLARS.map((p, i) => (
              <Reveal key={p.name} index={i % 2}>
                <div className="border-t border-forest-900/12 pt-6">
                  <div className="flex items-baseline gap-4">
                    <span className="font-serif text-2xl text-gold-deep">{p.n}</span>
                    <h3 className="font-serif text-2xl font-light text-forest-900">{p.name}</h3>
                  </div>
                  <p className="mt-3 font-sans text-base leading-relaxed text-forest-800/85">{p.measure}</p>
                  <p className="mt-2 font-sans text-sm italic leading-relaxed text-forest-800/65">{p.leak}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Le calculateur illustratif. */}
      <section className="border-b border-gold/15 bg-cream-100/60 py-24 md:py-32">
        <div className="container-editorial">
          <Reveal className="mx-auto mb-12 max-w-2xl text-center">
            <p className="eyebrow">A rough sense, in a moment</p>
            <h2 className="mt-4 font-serif text-4xl font-light text-forest-900 md:text-5xl">The dials, illustrated.</h2>
          </Reveal>
          <Reveal index={1}><LeakAuditWidget /></Reveal>
        </div>
      </section>

      {/* Le livrable : la Thèse d'Acquisition. */}
      <section className="border-b border-gold/15 py-24 md:py-32">
        <div className="container-editorial grid gap-14 md:grid-cols-[0.95fr_1.05fr] md:items-center">
          <Reveal>
            <p className="eyebrow">Gate two · what you receive</p>
            <h2 className="mt-5 font-serif text-4xl font-light leading-tight text-forest-900 md:text-5xl">
              A written thesis you own — figures, pillars, and a ninety-day plan.
            </h2>
            <div className="mt-7 max-w-prose space-y-5 font-sans text-base leading-relaxed text-forest-800/85">
              <p>
                The underwriting is where the free assessment becomes a document: where the loss sits,
                pillar by pillar, the sum we believe can be recovered, and precisely how we intend to
                recover it over ninety days.
              </p>
              <p>It is yours to keep, and yours to judge us by — whether or not you take the mandate.</p>
            </div>
          </Reveal>
          <Reveal index={1}><ThesisPreview /></Reveal>
        </div>
      </section>

      {/* Différenciation en toggle. */}
      <section className="py-24 md:py-32">
        <div className="container-editorial">
          <Reveal className="max-w-2xl">
            <p className="eyebrow">Told plainly</p>
            <h2 className="mt-5 font-serif text-4xl font-light text-forest-900 md:text-5xl">
              The difference isn’t a slogan. It’s where the money and the risk sit.
            </h2>
          </Reveal>
          <Reveal index={1} className="mt-12"><DifferentiationToggle /></Reveal>
        </div>
      </section>
    </>
  );
}
