import Link from "next/link";
import Image from "next/image";
import { Reveal } from "@/components/Reveal";
import { LeakAuditWidget } from "@/components/LeakAuditWidget";
import { TrajectoryChartLazy } from "@/components/TrajectoryChartLazy";

export default function HomePage() {
  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="relative flex min-h-screen items-center overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(176,141,76,0.12),transparent_55%)]" />
        <div className="container-editorial relative py-32 text-center">
          <div className="animate-fade-rise">
            <Image
              src="/crest.jpg"
              alt="Anesis Acquisition"
              width={560}
              height={459}
              priority
              className="mx-auto h-auto w-56 mix-blend-multiply md:w-72"
            />
            <p className="eyebrow mt-8">Hospitality acquisition underwriting · United Kingdom</p>
            <h1 className="mx-auto mt-6 max-w-4xl font-serif text-5xl font-light leading-[1.06] text-forest-900 md:text-7xl">
              The guests are already yours.
              <br />
              <span className="italic text-gold-deep">You’re paying to be introduced to them.</span>
            </h1>
            <p className="mx-auto mt-8 max-w-2xl font-sans text-lg leading-relaxed text-forest-800/80">
              A fifth of the people who would have booked you directly are quietly paying a platform to
              introduce them to a hotel they’d already found. We don’t ask you to spend more on marketing.
              We show you, in pounds, exactly where that fifth is going — then we go and get it back.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-5">
              <Link href="/diagnostic" className="btn-primary">
                Request an assessment
              </Link>
              <Link href="/method" className="link-underline font-sans text-sm">
                How we work
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── The hidden number ────────────────────────────────────────────────── */}
      <section className="border-t border-gold/15 py-28 md:py-36">
        <div className="container-editorial grid gap-14 md:grid-cols-[1.1fr_0.9fr] md:items-center">
          <Reveal>
            <p className="eyebrow">The number no one shows you</p>
            <h2 className="mt-5 font-serif text-4xl font-light leading-tight text-forest-900 md:text-5xl">
              Most of what a hotel loses never appears on an invoice.
            </h2>
            <div className="mt-7 max-w-prose space-y-5 font-sans text-base leading-relaxed text-forest-800/85">
              <p>
                It hides in a website that answers a second too slowly, in a review left unanswered for
                six hours, in a rate that quietly undercuts your own front desk, in demand that arrives
                warm and leaves unmet. None of it is dramatic. All of it adds up.
              </p>
              <p>
                An underwriter’s habit is to put a figure on precisely that — the quiet, recoverable
                loss — before promising anything. So that is where we begin.
              </p>
            </div>
          </Reveal>

          <Reveal index={1}>
            <figure className="rounded-2xl border border-forest-900/15 bg-cream-100 p-10 text-center">
              <figcaption className="eyebrow">Illustrative · a 28-key country house</figcaption>
              <p className="mt-4 font-serif text-6xl font-light text-forest-900">£7,400</p>
              <p className="mt-2 font-sans text-sm text-forest-800/70">
                recovered per month, once the direct channel is theirs again
              </p>
              <div className="mx-auto mt-8 h-px w-24 bg-gradient-to-r from-transparent via-gold/60 to-transparent" />
              <p className="mt-6 font-sans text-xs text-forest-800/55">
                A sample figure. Your own is measured, not assumed.
              </p>
            </figure>
          </Reveal>
        </div>
      </section>

      {/* ── Leak Audit widget (illustrative) ─────────────────────────────────── */}
      <section className="border-t border-gold/15 bg-cream-100/60 py-28 md:py-36">
        <div className="container-editorial">
          <Reveal className="mx-auto mb-12 max-w-2xl text-center">
            <p className="eyebrow">Try it for a moment</p>
            <h2 className="mt-4 font-serif text-4xl font-light text-forest-900 md:text-5xl">
              Move three dials. See roughly what’s at stake.
            </h2>
            <p className="mt-5 font-sans text-base text-forest-800/75">
              A rough sense of the exposure — no more. The real figure is measured from your own data,
              and it is free.
            </p>
          </Reveal>
          <Reveal index={1}>
            <LeakAuditWidget />
          </Reveal>
        </div>
      </section>

      {/* ── The three gates ──────────────────────────────────────────────────── */}
      <section className="border-t border-gold/15 py-28 md:py-36">
        <div className="container-editorial">
          <Reveal className="max-w-2xl">
            <p className="eyebrow">How the relationship is built</p>
            <h2 className="mt-5 font-serif text-4xl font-light text-forest-900 md:text-5xl">
              Three gates, in order. You only walk through the ones that earn their place.
            </h2>
          </Reveal>

          <div className="mt-16">
            {GATES.map((g, i) => (
              <Reveal key={g.no} index={i}>
                <div className="grid gap-6 border-t border-forest-900/12 py-10 md:grid-cols-[auto_1fr_1.4fr] md:items-baseline md:gap-12">
                  <span className="font-serif text-3xl text-gold-deep">{g.no}</span>
                  <h3 className="font-serif text-2xl font-light text-forest-900">{g.title}</h3>
                  <p className="max-w-prose font-sans text-base leading-relaxed text-forest-800/85">{g.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trajectory (teaser) ──────────────────────────────────────────────── */}
      <section className="border-t border-gold/15 py-28 md:py-36">
        <div className="container-editorial grid gap-12 md:grid-cols-[0.85fr_1.15fr] md:items-center">
          <Reveal>
            <p className="eyebrow">What recovery looks like</p>
            <h2 className="mt-5 font-serif text-4xl font-light leading-tight text-forest-900 md:text-5xl">
              We are paid on the distance between two lines.
            </h2>
            <p className="mt-6 max-w-prose font-sans text-base leading-relaxed text-forest-800/85">
              The flat line is your direct channel left alone. The rising one is the same channel,
              recovered. Our reward is tied to the gap — nothing else.
            </p>
            <Link href="/results" className="link-underline mt-7 inline-block font-sans text-sm">
              See the full record
            </Link>
          </Reveal>
          <Reveal index={1} className="rounded-2xl border border-forest-900/12 bg-cream-100/70 p-6 md:p-8">
            <TrajectoryChartLazy />
            <p className="eyebrow mt-4 text-right">Illustrative · sample trajectory</p>
          </Reveal>
        </div>
      </section>

      {/* ── Closing invitation ───────────────────────────────────────────────── */}
      <section className="border-t border-gold/15 bg-cream-100/60 py-28 md:py-36">
        <div className="container-editorial text-center">
          <Reveal>
            <h2 className="mx-auto max-w-3xl font-serif text-4xl font-light leading-tight text-forest-900 md:text-6xl">
              We refuse more hotels than we accept. Let us see whether yours is one we’d fight for.
            </h2>
            <div className="mt-10">
              <Link href="/diagnostic" className="btn-primary">
                Request your assessment
              </Link>
            </div>
            <p className="mt-6 font-sans text-sm text-forest-800/70">
              Write to us yourself, and you’ll hear back from someone who understands hospitality — not a
              queue, and never a script.
            </p>
          </Reveal>
        </div>
      </section>
    </>
  );
}

const GATES = [
  {
    no: "I",
    title: "The assessment",
    body: "Free, and grounded in your real data — your website, your reviews, your channel mix. We put a pounds-and-pence figure on what is recoverable, and tell you plainly if there isn’t enough there to be worth either of our time.",
  },
  {
    no: "II",
    title: "The underwriting",
    body: "A paid, written Acquisition Thesis: where the loss sits, pillar by pillar, the sum we believe can be recovered, and the ninety-day plan to do it. It is a document you own, whether or not you go further.",
  },
  {
    no: "III",
    title: "The mandate",
    body: "The engagement itself. We take financial responsibility for the recovery, and our reward is tied to what we actually return to your direct channel — never to how much you spend.",
  },
];
