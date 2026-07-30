import { Hero } from "@/components/Hero";
import { getHero } from "@/lib/hero-content";
import { Reveal } from "@/components/Reveal";
import { SloganBanner } from "@/components/site/SloganBanner";
import { getLang } from "@/lib/i18n";
import { getCopy } from "@/content/site";

export const metadata = { title: "About" };
export const dynamic = "force-dynamic";

export default async function AboutPage() {
  const lang = await getLang();
  const c = getCopy(lang).about;
  const L = <T,>(en: T, fr: T): T => (lang === "fr" ? fr : en);

  const icp = [
    { h: L("Boutique & country-house hotels", "Hôtels de charme & maisons de campagne"), b: L("Twenty to sixty rooms, a good reputation, but too many bookings coming through the platforms.", "De vingt à soixante chambres, une bonne réputation, mais trop de réservations qui passent par les plateformes.") },
    { h: L("Spa & wellness retreats", "Retraites spa & bien-être"), b: L("Where a slow reply or the wrong price loses a booking you'd almost won.", "Où une réponse lente ou un mauvais prix fait perdre une réservation presque gagnée.") },
    { h: L("Glamping & eco-lodges", "Glamping & éco-lodges"), b: L("Strong seasonal demand that too often reaches you through a platform taking its cut.", "Une forte demande saisonnière qui vous parvient trop souvent via une plateforme qui prend sa commission.") },
    { h: L("Small independent resorts", "Petits resorts indépendants"), b: L("Big enough to feel the lost commission, small enough that fixing it changes your year.", "Assez grands pour sentir les commissions perdues, assez petits pour qu'y remédier change votre année.") },
  ];

  return (
    <>
      <Hero {...getHero(lang, "about")} hideNav />

      <section className="border-b border-gold/15 py-24 md:py-32">
        <div className="container-editorial grid gap-14 md:grid-cols-[0.8fr_1.2fr]">
          <Reveal>
            <p className="eyebrow">{c.eyebrow}</p>
          </Reveal>
          <Reveal index={1}>
            <div className="max-w-prose space-y-6">
              <p className="font-serif text-xl font-light leading-relaxed text-forest-900">{c.body[0]}</p>
              <p className="font-sans text-base leading-relaxed text-forest-800/85">{c.body[1]}</p>
            </div>
          </Reveal>
        </div>
      </section>

      <SloganBanner
        image="/img/uk-countryside.jpg"
        slogan={L("Fewer bookings through the platforms. More straight to you.", "Moins de réservations via les plateformes. Plus directement chez vous.")}
      />

      {/* Qui nous accompagnons (ICP). */}
      <section className="py-24 md:py-32">
        <div className="container-editorial">
          <Reveal className="max-w-2xl">
            <p className="eyebrow">{L("Who we work with", "Qui nous accompagnons")}</p>
            <h2 className="mt-5 font-serif text-4xl font-light text-forest-900 md:text-5xl">
              {L("The hotels we help.", "Les hôtels que nous aidons.")}
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-x-12 gap-y-10 md:grid-cols-2">
            {icp.map((v, i) => (
              <Reveal key={v.h} index={i % 2}>
                <div className="border-t border-forest-900/12 pt-6">
                  <h3 className="font-serif text-2xl font-light text-forest-900">{v.h}</h3>
                  <p className="mt-3 max-w-prose font-sans text-base leading-relaxed text-forest-800/85">{v.b}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 md:py-32">
        <div className="container-editorial">
          <Reveal className="max-w-2xl">
            <p className="eyebrow">{c.valuesEyebrow}</p>
          </Reveal>
          <div className="mt-12 grid gap-x-12 gap-y-10 md:grid-cols-3">
            {c.values.map((v, i) => (
              <Reveal key={v.h} index={i}>
                <div className="border-t border-forest-900/12 pt-6">
                  <h3 className="font-serif text-2xl font-light text-forest-900">{v.h}</h3>
                  <p className="mt-3 max-w-prose font-sans text-base leading-relaxed text-forest-800/85">{v.b}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <SloganBanner
        image="/img/uk-estate.jpg"
        slogan={L("We only take hotels we're confident we can help.", "Nous n'acceptons que les hôtels que nous sommes sûrs de pouvoir aider.")}
      />
    </>
  );
}
