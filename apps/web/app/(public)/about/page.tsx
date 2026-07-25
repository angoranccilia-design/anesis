import { PageHeader } from "@/components/site/PageHeader";
import { Reveal } from "@/components/Reveal";

export const metadata = { title: "About" };

const PRINCIPLES = [
  { t: "Measured before promised", b: "We put a figure on the recoverable loss before we say a word about recovering it. If the figure isn’t there, neither are we." },
  { t: "Paid on what returns", b: "Our reward is tied to the direct revenue we actually recover — never to how much you spend, and never to activity for its own sake." },
  { t: "Fewer, better mandates", b: "We refuse more hotels than we accept. A mandate we take is one we believe we can be held financially responsible for." },
  { t: "One considered voice", b: "Write to us, and the same person who understands hospitality reads it. There is no queue behind the door." },
];

export default function AboutPage() {
  return (
    <>
      <PageHeader
        eyebrow="The firm"
        title="An underwriter’s discipline, brought to hospitality."
        lede="We measure what your independence is costing you, price it in pounds, and take responsibility for recovering it. That is the whole introduction."
      />

      <section className="border-b border-gold/15 py-24 md:py-32">
        <div className="container-editorial grid gap-14 md:grid-cols-[0.8fr_1.2fr]">
          <Reveal>
            <p className="eyebrow">The discipline</p>
          </Reveal>
          <Reveal index={1}>
            <div className="max-w-prose space-y-6 font-serif text-xl font-light leading-relaxed text-forest-900">
              <p>
                An underwriter’s first instinct is not to sell. It is to measure — to put a number on the
                risk, and on what can be recovered — before anything is promised.
              </p>
              <p className="font-sans text-base leading-relaxed text-forest-800/85">
                Independent hotels of character rarely lack demand. They lose it quietly: to a website
                that answers too slowly, to a review left waiting, to a platform that charges to
                introduce a guest who was already theirs. We bring the habits of underwriting to that
                loss — we quantify it, we price it, and we stand behind the recovery in pounds.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="border-b border-gold/15 py-24 md:py-32">
        <div className="container-editorial grid gap-14 md:grid-cols-[0.8fr_1.2fr]">
          <Reveal>
            <p className="eyebrow">The founder</p>
          </Reveal>
          <Reveal index={1}>
            <div className="max-w-prose space-y-5 font-sans text-base leading-relaxed text-forest-800/85">
              <p>
                The method was built and proven in North America, across boutique groups and country
                properties, before it was brought to the United Kingdom. We show that record clearly
                labelled — and we don’t borrow it to imply results we haven’t yet earned here.
              </p>
              <p>
                The firm is deliberately small, and designed to stay that way: a handful of people, each
                accountable for a distinct part of a hotel’s recovery, rather than a large agency selling
                hours.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="py-24 md:py-32">
        <div className="container-editorial">
          <Reveal className="max-w-2xl">
            <p className="eyebrow">What we hold to</p>
            <h2 className="mt-5 font-serif text-4xl font-light text-forest-900 md:text-5xl">Four principles, kept plainly.</h2>
          </Reveal>
          <div className="mt-14 grid gap-x-12 gap-y-10 md:grid-cols-2">
            {PRINCIPLES.map((p, i) => (
              <Reveal key={p.t} index={i % 2}>
                <div className="border-t border-forest-900/12 pt-6">
                  <h3 className="font-serif text-2xl font-light text-forest-900">{p.t}</h3>
                  <p className="mt-3 max-w-prose font-sans text-base leading-relaxed text-forest-800/85">{p.b}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
