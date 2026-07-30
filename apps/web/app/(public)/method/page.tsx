import { Hero } from "@/components/Hero";
import { getHero } from "@/lib/hero-content";
import { Reveal } from "@/components/Reveal";
import { LeakAuditWidget } from "@/components/LeakAuditWidget";
import { ThesisPreview } from "@/components/ThesisPreview";
import { DifferentiationToggle } from "@/components/DifferentiationToggle";
import { getLang } from "@/lib/i18n";
import { getCopy } from "@/content/site";

export const metadata = { title: "Method" };
export const dynamic = "force-dynamic";

export default async function MethodPage() {
  const lang = await getLang();
  const c = getCopy(lang).method;
  const L = <T,>(en: T, fr: T): T => (lang === "fr" ? fr : en);

  return (
    <>
      <Hero {...getHero(lang, "method")} hideNav />

      {/* Les cinq piliers. */}
      <section className="border-b border-gold/15 py-24 md:py-32">
        <div className="container-editorial">
          <Reveal className="max-w-2xl">
            <p className="eyebrow">{c.pillarsEyebrow}</p>
            <h2 className="mt-5 font-serif text-4xl font-light text-forest-900 md:text-5xl">
              {L("Five things a marketer rarely priced.", "Cinq choses qu'un marketeur a rarement chiffrées.")}
            </h2>
          </Reveal>
          <div className="mt-14 grid gap-x-12 gap-y-10 md:grid-cols-2">
            {c.pillars.map((pil, i) => (
              <Reveal key={pil.h} index={i % 2}>
                <div className="border-t border-forest-900/12 pt-6">
                  <div className="flex items-baseline gap-4">
                    <span className="font-serif text-2xl text-gold-deep">{String(i + 1).padStart(2, "0")}</span>
                    <h3 className="font-serif text-2xl font-light text-forest-900">{pil.h}</h3>
                  </div>
                  <p className="mt-3 font-sans text-base leading-relaxed text-forest-800/85">{pil.b}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Calculateur illustratif. */}
      <section className="border-b border-gold/15 bg-cream-100/60 py-24 md:py-32">
        <div className="container-editorial">
          <Reveal className="mx-auto mb-12 max-w-2xl text-center">
            <p className="eyebrow">{L("A rough sense, in a moment", "Un ordre de grandeur, en un instant")}</p>
            <h2 className="mt-4 font-serif text-4xl font-light text-forest-900 md:text-5xl">{L("The dials, illustrated.", "Les curseurs, illustrés.")}</h2>
          </Reveal>
          <Reveal index={1}><LeakAuditWidget /></Reveal>
        </div>
      </section>

      {/* Le livrable : la Thèse d'Acquisition. */}
      <section className="border-b border-gold/15 py-24 md:py-32">
        <div className="container-editorial grid gap-14 md:grid-cols-[0.95fr_1.05fr] md:items-center">
          <Reveal>
            <p className="eyebrow">{L("Gate two · what you receive", "Porte deux · ce que vous recevez")}</p>
            <h2 className="mt-5 font-serif text-4xl font-light leading-tight text-forest-900 md:text-5xl">
              {L("A written thesis you own — figures, pillars, and a ninety-day plan.", "Une thèse écrite qui vous appartient — chiffres, piliers, et un plan à quatre-vingt-dix jours.")}
            </h2>
            <div className="mt-7 max-w-prose space-y-5 font-sans text-base leading-relaxed text-forest-800/85">
              <p>{L("The underwriting is where the free assessment becomes a document: where the loss sits, pillar by pillar, the sum we believe can be recovered, and precisely how we intend to recover it over ninety days.", "La souscription, c'est là où l'évaluation gratuite devient un document : où se loge la perte, pilier par pilier, la somme que nous pensons récupérable, et précisément comment nous comptons la récupérer en quatre-vingt-dix jours.")}</p>
              <p>{L("It is yours to keep, and yours to judge us by — whether or not you take the mandate.", "Il est à vous, et c'est à cette aune que vous nous jugerez — que vous preniez le mandat ou non.")}</p>
            </div>
          </Reveal>
          <Reveal index={1}><ThesisPreview /></Reveal>
        </div>
      </section>

      {/* Différenciation. */}
      <section className="py-24 md:py-32">
        <div className="container-editorial">
          <Reveal className="max-w-2xl">
            <p className="eyebrow">{L("Told plainly", "Dit franchement")}</p>
            <h2 className="mt-5 font-serif text-4xl font-light text-forest-900 md:text-5xl">
              {L("The difference isn't a slogan. It's where the money and the risk sit.", "La différence n'est pas un slogan. C'est là où se logent l'argent et le risque.")}
            </h2>
          </Reveal>
          <Reveal index={1} className="mt-12"><DifferentiationToggle /></Reveal>
        </div>
      </section>
    </>
  );
}
