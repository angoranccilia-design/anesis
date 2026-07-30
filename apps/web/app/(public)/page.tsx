import Link from "next/link";
import Image from "next/image";
import { Reveal } from "@/components/Reveal";
import { LeakAuditWidget } from "@/components/LeakAuditWidget";
import { TrajectoryChartLazy } from "@/components/TrajectoryChartLazy";
import { BeforeAfterFeed } from "@/components/BeforeAfterFeed";
import { Hero } from "@/components/Hero";
import { getHero } from "@/lib/hero-content";
import { getLang } from "@/lib/i18n";
import { getCopy } from "@/content/site";

export const dynamic = "force-dynamic"; // langue lue par requête (cookie)

export default async function HomePage() {
  const lang = await getLang();
  const c = getCopy(lang).home;
  const L = <T,>(en: T, fr: T): T => (lang === "fr" ? fr : en);

  const chain = L(
    ["More direct bookings", "Less commission paid to platforms", "Faster replies to enquiries", "Better online reviews", "A social presence that's actually kept up", "Revenue you can measure"],
    ["Plus de réservations directes", "Moins de commissions versées aux plateformes", "Des réponses plus rapides aux demandes", "De meilleurs avis en ligne", "Une présence sociale vraiment tenue", "Un revenu que vous pouvez mesurer"],
  );

  const categories = [
    { img: "/img/new-hotel-reception-coastal.jpg", label: L("Boutique hotels", "Hôtels boutique") },
    { img: "/img/new-hotel-hall-chandelier.jpg", label: L("Country houses", "Maisons de campagne") },
    { img: "/img/new-spa-elegant-02.jpg", label: L("Spa retreats", "Retraites spa") },
    { img: "/img/new-glamping-misty-forest.jpg", label: L("Glamping", "Glamping") },
    { img: "/img/new-eco-lodge-01.jpg", label: L("Eco-lodges", "Éco-lodges") },
  ];

  return (
    <>
      {/* ── Hero cinématique (vidéo glamping + header de marque) ───────────────── */}
      <Hero {...getHero(lang, "home")} hideNav />

      {/* ── Underwriting firm — positionnement / éducation ──────────────────── */}
      <section className="border-t border-gold/15 bg-cream-100/60 py-28 md:py-36">
        <div className="container-editorial">
          <Reveal className="max-w-3xl">
            <p className="eyebrow">{c.underEyebrow}</p>
            <h2 className="mt-5 font-serif text-4xl font-light leading-tight text-forest-900 md:text-5xl">{c.underTitle}</h2>
            <p className="mt-6 max-w-2xl font-sans text-base leading-relaxed text-forest-800/85">{c.underLede}</p>
          </Reveal>
          <div className="mt-14 grid gap-x-12 gap-y-10 md:grid-cols-3">
            {c.under.map((u, i) => (
              <Reveal key={u.h} index={i}>
                <div className="border-t-2 border-gold/40 pt-6">
                  <span className="font-serif text-2xl text-gold-deep">{String(i + 1).padStart(2, "0")}</span>
                  <h3 className="mt-2 font-serif text-2xl font-light text-forest-900">{u.h}</h3>
                  <p className="mt-3 max-w-prose font-sans text-base leading-relaxed text-forest-800/85">{u.b}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── The hidden number ───────────────────────────────────────────────── */}
      <section className="border-t border-gold/15 py-28 md:py-36">
        <div className="container-editorial grid gap-14 md:grid-cols-[1.1fr_0.9fr] md:items-center">
          <Reveal>
            <p className="eyebrow">{c.hiddenEyebrow}</p>
            <h2 className="mt-5 font-serif text-4xl font-light leading-tight text-forest-900 md:text-5xl">{c.hiddenTitle}</h2>
            <div className="mt-7 max-w-prose space-y-5 font-sans text-base leading-relaxed text-forest-800/85">
              <p>{c.hiddenBody1}</p>
              <p>{c.hiddenBody2}</p>
            </div>
          </Reveal>
          <Reveal index={1}>
            <figure className="rounded-2xl border border-forest-900/15 bg-cream-100 p-10 text-center">
              <figcaption className="eyebrow">{c.sampleCaption}</figcaption>
              <p className="mt-4 font-serif text-6xl font-light text-forest-900">£7,400</p>
              <p className="mt-2 font-sans text-sm text-forest-800/70">{c.sampleUnder}</p>
              <div className="mx-auto mt-8 h-px w-24 bg-gradient-to-r from-transparent via-gold/60 to-transparent" />
              <p className="mt-6 font-sans text-xs text-forest-800/55">{c.sampleNote}</p>
            </figure>
          </Reveal>
        </div>
      </section>

      {/* ── Marquee (la chaîne du système) ──────────────────────────────────── */}
      <section className="overflow-hidden bg-forest-950 py-7">
        <div className="marquee-track">
          {[...chain, ...chain].map((s, i) => (
            <span key={i} className="flex items-center whitespace-nowrap px-6 font-serif text-lg italic text-cream-100/85">
              {s}
              <span className="ml-6 text-gold-light">→</span>
            </span>
          ))}
        </div>
      </section>

      {/* ── Leak Audit widget ───────────────────────────────────────────────── */}
      <section className="border-t border-gold/15 bg-cream-100/60 py-28 md:py-36">
        <div className="container-editorial">
          <Reveal className="mx-auto mb-12 max-w-2xl text-center">
            <p className="eyebrow">{c.widgetEyebrow}</p>
            <h2 className="mt-4 font-serif text-4xl font-light text-forest-900 md:text-5xl">{c.widgetTitle}</h2>
            <p className="mt-5 font-sans text-base text-forest-800/75">{c.widgetSub}</p>
          </Reveal>
          <Reveal index={1}>
            <LeakAuditWidget />
          </Reveal>
        </div>
      </section>

      {/* ── What we do (services concrets) ──────────────────────────────────── */}
      <section className="border-t border-gold/15 py-28 md:py-36">
        <div className="container-editorial">
          <Reveal className="max-w-2xl">
            <p className="eyebrow">{c.servicesEyebrow}</p>
            <h2 className="mt-5 font-serif text-4xl font-light leading-tight text-forest-900 md:text-5xl">{c.servicesTitle}</h2>
          </Reveal>
          <div className="mt-14 grid gap-x-12 gap-y-10 md:grid-cols-3">
            {c.services.map((s, i) => (
              <Reveal key={s.h} index={i % 3}>
                <div className="border-t border-forest-900/12 pt-6">
                  <h3 className="font-serif text-2xl font-light text-forest-900">{s.h}</h3>
                  <p className="mt-3 max-w-prose font-sans text-base leading-relaxed text-forest-800/85">{s.b}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Category cards (établissements servis) ──────────────────────────── */}
      <section className="py-28 md:py-32">
        <div className="container-editorial">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
            {categories.map((cat, i) => (
              <Reveal key={cat.label} index={i}>
                <div className="cat-card">
                  <Image src={cat.img} alt={cat.label} width={480} height={600} className="h-full w-full object-cover" />
                  <span className="absolute bottom-4 left-4 z-10 font-serif text-lg text-cream-50">{cat.label}</span>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── The three gates ─────────────────────────────────────────────────── */}
      <section className="border-t border-gold/15 py-28 md:py-36">
        <div className="container-editorial">
          <Reveal className="max-w-2xl">
            <p className="eyebrow">{c.gatesEyebrow}</p>
            <h2 className="mt-5 font-serif text-4xl font-light text-forest-900 md:text-5xl">{c.gatesTitle}</h2>
          </Reveal>
          <div className="mt-16">
            {c.gates.map((g, i) => (
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

      {/* ── Before / after feed (5e pilier) ─────────────────────────────────── */}
      <section className="border-t border-gold/15 bg-cream-100/60 py-28 md:py-36">
        <div className="container-editorial grid gap-12 md:grid-cols-[0.9fr_1.1fr] md:items-center">
          <Reveal>
            <p className="eyebrow">{c.feedEyebrow}</p>
            <h2 className="mt-5 font-serif text-4xl font-light leading-tight text-forest-900 md:text-5xl">{c.feedTitle}</h2>
            <p className="mt-6 max-w-prose font-sans text-base leading-relaxed text-forest-800/85">{c.feedBody}</p>
          </Reveal>
          <Reveal index={1}>
            <BeforeAfterFeed />
          </Reveal>
        </div>
      </section>

      {/* ── Trajectory (Recharts) ───────────────────────────────────────────── */}
      <section className="border-t border-gold/15 py-28 md:py-36">
        <div className="container-editorial grid gap-12 md:grid-cols-[0.85fr_1.15fr] md:items-center">
          <Reveal>
            <p className="eyebrow">{c.trajEyebrow}</p>
            <h2 className="mt-5 font-serif text-4xl font-light leading-tight text-forest-900 md:text-5xl">{c.trajTitle}</h2>
            <p className="mt-6 max-w-prose font-sans text-base leading-relaxed text-forest-800/85">{c.trajBody}</p>
            <Link href="/results" className="link-underline mt-7 inline-block font-sans text-sm">{c.trajLink}</Link>
          </Reveal>
          <Reveal index={1} className="rounded-2xl border border-forest-900/12 bg-cream-100/70 p-6 md:p-8">
            <TrajectoryChartLazy />
            <p className="eyebrow mt-4 text-right">{c.trajCaption}</p>
          </Reveal>
        </div>
      </section>

      {/* ── Closing (photo banner) ──────────────────────────────────────────── */}
      <section className="full-banner">
        <Image src="/img/new-wedding-toast-outdoor.jpg" alt="" fill sizes="100vw" className="full-banner-img" />
        <div className="container-editorial relative py-28 text-center text-cream-50">
          <Reveal>
            <h2 className="mx-auto max-w-3xl font-serif text-4xl font-light leading-tight md:text-6xl">{c.closeTitle}</h2>
            <div className="mt-10">
              <Link href="/diagnostic" className="btn-gold">{c.closeCta}</Link>
            </div>
            <p className="mx-auto mt-6 max-w-xl font-sans text-sm text-cream-100/80">{c.closeNote}</p>
          </Reveal>
        </div>
      </section>
    </>
  );
}
