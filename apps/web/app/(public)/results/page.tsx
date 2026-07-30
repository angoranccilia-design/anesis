import { Hero } from "@/components/Hero";
import { getHero } from "@/lib/hero-content";
import { Reveal } from "@/components/Reveal";
import { TrajectoryChartLazy } from "@/components/TrajectoryChartLazy";
import { SloganBanner } from "@/components/site/SloganBanner";
import { getLang } from "@/lib/i18n";
import { getCopy } from "@/content/site";

export const metadata = { title: "Results" };
export const dynamic = "force-dynamic";

export default async function ResultsPage() {
  const lang = await getLang();
  const c = getCopy(lang);
  const r = c.results;
  const L = <T,>(en: T, fr: T): T => (lang === "fr" ? fr : en);

  // Modèles ILLUSTRATIFs (établissements fictifs UK) — jamais présentés comme des résultats réels.
  const models = [
    { label: L("Example · Cotswolds country house · 28 rooms", "Exemple · maison de campagne des Cotswolds · 28 chambres"), figure: "£7,400", body: L("Example of the direct revenue recovered each month once fewer bookings go through the platforms.", "Exemple de revenu direct récupéré chaque mois une fois que moins de réservations passent par les plateformes.") },
    { label: L("Example · Cornwall coastal inn · 24 rooms", "Exemple · auberge côtière de Cornouailles · 24 chambres"), figure: "31%", body: L("Example share of bookings moved back to the hotel's own website over two seasons, with no extra ad spend.", "Exemple de part des réservations ramenée vers le site de l'hôtel sur deux saisons, sans dépense publicitaire supplémentaire.") },
    { label: L("Example · South-West spa retreat · 40 rooms", "Exemple · retraite spa du Sud-Ouest · 40 chambres"), figure: "4.6★", body: L("Example rating kept high by replying to every review within two hours.", "Exemple de note maintenue élevée en répondant à chaque avis en moins de deux heures.") },
  ];

  return (
    <>
      <Hero {...getHero(lang, "results")} hideNav />

      {/* Trajectoire (Recharts) : ligne de base vs récupéré. */}
      <section className="border-b border-gold/15 py-24 md:py-32">
        <div className="container-editorial">
          <Reveal className="max-w-2xl">
            <p className="eyebrow">{L("The mechanism, drawn", "Le mécanisme, dessiné")}</p>
            <h2 className="mt-5 font-serif text-4xl font-light text-forest-900 md:text-5xl">{r.title}</h2>
            <p className="mt-6 max-w-prose font-sans text-base leading-relaxed text-forest-800/85">
              {L("The flat line is your direct bookings if nothing changes. The rising line is the same channel after we've worked on it. We're paid on the gap — never on what you spend.", "La courbe plate, ce sont vos réservations directes si rien ne change. La courbe montante, c'est le même canal une fois que nous y avons travaillé. Nous sommes payés sur l'écart — jamais sur ce que vous dépensez.")}
            </p>
          </Reveal>
          <Reveal index={1} className="mt-12 rounded-2xl border border-forest-900/12 bg-cream-100/70 p-6 md:p-10">
            <TrajectoryChartLazy />
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-6 font-sans text-xs text-forest-800/70">
                <span className="flex items-center gap-2"><span className="inline-block h-px w-6 border-t border-dashed border-[#9AA79B]" /> {L("Baseline", "Ligne de base")}</span>
                <span className="flex items-center gap-2"><span className="inline-block h-0.5 w-6 bg-gold" /> {L("With Anesis", "Avec Anesis")}</span>
              </div>
              <p className="eyebrow">{L("Illustrative · sample trajectory", "Illustratif · trajectoire indicative")}</p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Modèles illustratifs UK — marqués. */}
      <section className="border-b border-gold/15 py-24 md:py-32">
        <div className="container-editorial">
          <Reveal className="max-w-2xl">
            <p className="eyebrow">{L("Illustrative models", "Modèles illustratifs")}</p>
            <h2 className="mt-5 font-serif text-4xl font-light text-forest-900 md:text-5xl">
              {L("How a recovery is measured — shown honestly.", "Comment une récupération se mesure — montré honnêtement.")}
            </h2>
          </Reveal>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {models.map((m, i) => (
              <Reveal key={m.label} index={i}>
                <figure className="h-full rounded-2xl border border-forest-900/12 bg-cream-50 p-8">
                  <figcaption className="eyebrow">{m.label}</figcaption>
                  <p className="mt-4 font-serif text-5xl font-light text-forest-900">{m.figure}</p>
                  <p className="mt-3 font-sans text-sm leading-relaxed text-forest-800/80">{m.body}</p>
                </figure>
              </Reveal>
            ))}
          </div>
          <p className="mt-10 max-w-prose font-sans text-xs leading-relaxed text-forest-800/55">{c.demoBadge}</p>
        </div>
      </section>

      <SloganBanner
        image="/img/new-resort-infinity-pool.jpg"
        slogan={L("We are paid on the gap we actually close. Nothing else.", "Nous sommes rémunérés sur l'écart que nous refermons réellement. Rien d'autre.")}
      />

      {/* Quand nous refusons. */}
      <section className="py-24 md:py-32">
        <div className="container-editorial grid gap-14 md:grid-cols-[0.8fr_1.2fr] md:items-center">
          <Reveal>
            <p className="eyebrow">{r.naEyebrow}</p>
            <h2 className="mt-5 font-serif text-4xl font-light leading-tight text-forest-900 md:text-5xl">{r.naTitle}</h2>
          </Reveal>
          <Reveal index={1}>
            <p className="max-w-prose font-sans text-base leading-relaxed text-forest-800/85">{r.naBody}</p>
          </Reveal>
        </div>
      </section>
    </>
  );
}
