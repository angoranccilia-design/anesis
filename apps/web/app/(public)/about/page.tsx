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
    { h: L("Boutique & country-house hotels", "Hôtels de charme & maisons de campagne"), b: L("Twenty to sixty keys, with a name people already recommend — and a booking mix that quietly leans on the platforms.", "De vingt à soixante clés, avec un nom que l'on recommande déjà — et un mix de réservations qui s'appuie discrètement sur les plateformes.") },
    { h: L("Spa & wellness retreats", "Retraites spa & bien-être"), b: L("Where the experience is the product, and a slow reply or a parity slip costs a booking that was already half-won.", "Là où l'expérience est le produit, et où une réponse lente ou un écart de parité coûte une réservation déjà à moitié gagnée.") },
    { h: L("Glamping estates & eco-lodges", "Domaines de glamping & éco-lodges"), b: L("High-season demand that the OTAs are happy to take a cut of — when it could have come direct.", "Une demande de haute saison dont les OTA prélèvent volontiers leur part — alors qu'elle aurait pu venir en direct.") },
    { h: L("Small independent resorts", "Petits resorts indépendants"), b: L("Enough rooms to feel the leak clearly, small enough that one honest hand on the channel mix changes the year.", "Assez de chambres pour sentir la fuite nettement, assez petits pour qu'une main honnête sur le mix de canaux change l'année.") },
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
        slogan={L("We don't sell more marketing. We sell back what was already yours.", "Nous ne vendons pas plus de marketing. Nous vous rendons ce qui vous appartenait déjà.")}
      />

      {/* Qui nous accompagnons (ICP). */}
      <section className="py-24 md:py-32">
        <div className="container-editorial">
          <Reveal className="max-w-2xl">
            <p className="eyebrow">{L("Who we work with", "Qui nous accompagnons")}</p>
            <h2 className="mt-5 font-serif text-4xl font-light text-forest-900 md:text-5xl">
              {L("Places with a name — and a leak.", "Des lieux qui ont un nom — et une fuite.")}
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
        slogan={L("Most firms want every client. We only want the ones we can be honest with.", "La plupart des cabinets veulent tous les clients. Nous ne voulons que ceux avec qui nous pouvons être honnêtes.")}
      />
    </>
  );
}
