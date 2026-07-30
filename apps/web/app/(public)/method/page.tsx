import { Hero } from "@/components/Hero";
import { getHero } from "@/lib/hero-content";
import { Reveal } from "@/components/Reveal";
import { LeakAuditWidget } from "@/components/LeakAuditWidget";
import { ThesisPreview } from "@/components/ThesisPreview";
import { DifferentiationToggle } from "@/components/DifferentiationToggle";
import { SloganBanner } from "@/components/site/SloganBanner";
import { getLang } from "@/lib/i18n";
import { getCopy } from "@/content/site";

export const metadata = { title: "Method" };
export const dynamic = "force-dynamic";

export default async function MethodPage() {
  const lang = await getLang();
  const c = getCopy(lang).method;
  const L = <T,>(en: T, fr: T): T => (lang === "fr" ? fr : en);

  const gates = [
    { h: L("A free assessment", "Une évaluation gratuite"), b: L("We read your hotel from the outside — channel mix, response times, rate parity, reputation, website — and give you a first sense of the leak. No charge, no obligation.", "Nous lisons votre hôtel de l'extérieur — mix de canaux, temps de réponse, parité tarifaire, réputation, site web — et vous donnons un premier ordre de grandeur de la fuite. Sans frais, sans obligation.") },
    { h: L("A paid Acquisition Thesis", "Une Thèse d'Acquisition payante"), b: L("Over about two weeks, the assessment becomes a written document you own: where the loss sits, pillar by pillar, the sum we believe is recoverable, and a ninety-day plan to recover it.", "En deux semaines environ, l'évaluation devient un document écrit qui vous appartient : où se loge la perte, pilier par pilier, la somme que nous croyons récupérable, et un plan à quatre-vingt-dix jours pour la récupérer.") },
    { h: L("A mandate — only if it holds", "Un mandat — seulement s'il tient"), b: L("If, and only if, the thesis convinces you, we begin. We are paid on the gap we actually close, not on the plan.", "Si, et seulement si, la thèse vous convainc, nous commençons. Nous sommes rémunérés sur l'écart que nous refermons réellement, pas sur le plan.") },
  ];

  const monthly = [
    L("A monthly Revenue Leak Index — the same score, tracked over time.", "Un Indice de Fuite de Revenu mensuel — le même score, suivi dans le temps."),
    L("A recovery ledger: what you kept in direct bookings this month, not the platforms.", "Un registre de récupération : ce que vous avez gardé en réservations directes ce mois-ci, pas les plateformes."),
    L("A 120-day leak calendar — where the next losses are likely, before they happen.", "Un calendrier de fuite à 120 jours — où les prochaines pertes sont probables, avant qu'elles n'arrivent."),
    L("A content and social calendar, planned and published.", "Un calendrier de contenu et de réseaux sociaux, planifié et publié."),
    L("A monthly newsletter to your past guests.", "Une newsletter mensuelle à vos anciens clients."),
    L("Rate-parity monitoring across the platforms.", "Une surveillance de la parité tarifaire sur les plateformes."),
    L("Website conversion work — the direct booking path, kept sharp.", "Un travail de conversion du site — le chemin de réservation directe, gardé net."),
    L("A plain-English report, signed by a person — never an automated dashboard alone.", "Un rapport en langage clair, signé par une personne — jamais un tableau de bord automatisé seul."),
  ];

  return (
    <>
      <Hero {...getHero(lang, "method")} hideNav />

      {/* Comment ça marche, dans l'ordre. */}
      <section className="border-b border-gold/15 py-24 md:py-32">
        <div className="container-editorial">
          <Reveal className="max-w-2xl">
            <p className="eyebrow">{L("How this actually works, in order", "Comment ça marche, dans l'ordre")}</p>
            <h2 className="mt-5 font-serif text-4xl font-light text-forest-900 md:text-5xl">
              {L("Three gates. You pass each before the next.", "Trois portes. Vous franchissez chacune avant la suivante.")}
            </h2>
          </Reveal>
          <div className="mt-14 grid gap-x-12 gap-y-10 md:grid-cols-3">
            {gates.map((g, i) => (
              <Reveal key={g.h} index={i}>
                <div className="border-t border-forest-900/12 pt-6">
                  <span className="font-serif text-2xl text-gold-deep">{String(i + 1).padStart(2, "0")}</span>
                  <h3 className="mt-2 font-serif text-2xl font-light text-forest-900">{g.h}</h3>
                  <p className="mt-3 font-sans text-base leading-relaxed text-forest-800/85">{g.b}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

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

      <SloganBanner
        image="/img/new-banner-corridor-geometric.jpg"
        slogan={L("The machine gathers. The number is fixed. A person signs it.", "La machine collecte. Le chiffre est arrêté. Une personne le signe.")}
      />

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

      {/* Ce que vous recevez chaque mois. */}
      <section className="border-b border-gold/15 py-24 md:py-32">
        <div className="container-editorial">
          <Reveal className="max-w-2xl">
            <p className="eyebrow">{L("Once the mandate begins", "Une fois le mandat commencé")}</p>
            <h2 className="mt-5 font-serif text-4xl font-light text-forest-900 md:text-5xl">
              {L("What you actually receive each month.", "Ce que vous recevez réellement chaque mois.")}
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-x-12 gap-y-6 md:grid-cols-2">
            {monthly.map((m, i) => (
              <Reveal key={i} index={i % 2}>
                <div className="flex gap-4 border-t border-forest-900/12 pt-5">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                  <p className="font-sans text-base leading-relaxed text-forest-800/85">{m}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <SloganBanner
        image="/img/new-banner-reception-gold.jpg"
        slogan={L("Every pound we report, you could check yourself.", "Chaque livre que nous rapportons, vous pourriez la vérifier vous-même.")}
      />

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
