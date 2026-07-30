import { Hero } from "@/components/Hero";
import { HERO_PAGES } from "@/lib/hero-content";
import { Reveal } from "@/components/Reveal";
import { TrajectoryChartLazy } from "@/components/TrajectoryChartLazy";
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
    { label: L("Illustrative · Cotswolds country house · 28 keys", "Illustratif · maison de campagne des Cotswolds · 28 clés"), figure: "£7,400", body: L("Modelled monthly direct revenue recovered once the channel mix is rebalanced away from the platforms.", "Revenu direct mensuel modélisé, récupéré une fois le mix de canaux rééquilibré hors plateformes.") },
    { label: L("Illustrative · Cornwall coastal inn · 24 keys", "Illustratif · auberge côtière de Cornouailles · 24 clés"), figure: "31%", body: L("Modelled share of bookings returned to the direct channel over two seasons, without more advertising.", "Part des réservations modélisée, rendue au canal direct sur deux saisons, sans publicité supplémentaire.") },
    { label: L("Illustrative · South-West spa retreat · 40 keys", "Illustratif · retraite spa du Sud-Ouest · 40 clés"), figure: "4.6★", body: L("Modelled review rating held with reply times under two hours — reputation as a booking driver.", "Note d'avis modélisée maintenue avec des réponses en moins de deux heures — la réputation comme moteur de réservation.") },
  ];

  return (
    <>
      <Hero {...HERO_PAGES.results} hideNav />

      {/* Trajectoire (Recharts) : ligne de base vs récupéré. */}
      <section className="border-b border-gold/15 py-24 md:py-32">
        <div className="container-editorial">
          <Reveal className="max-w-2xl">
            <p className="eyebrow">{L("The mechanism, drawn", "Le mécanisme, dessiné")}</p>
            <h2 className="mt-5 font-serif text-4xl font-light text-forest-900 md:text-5xl">{r.title}</h2>
            <p className="mt-6 max-w-prose font-sans text-base leading-relaxed text-forest-800/85">
              {L("The flat line is what the direct channel would do, left alone. The rising one is the same channel, recovered. Our reward is tied to the gap — never to how much you spend.", "La courbe plate, c'est ce que ferait le canal direct laissé seul. La courbe montante, c'est le même canal, récupéré. Notre rémunération est liée à l'écart — jamais à ce que vous dépensez.")}
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
