import { Hero } from "@/components/Hero";
import { getHero } from "@/lib/hero-content";
import { Reveal } from "@/components/Reveal";
import { LeakAuditWidget } from "@/components/LeakAuditWidget";
import { ThesisPreview } from "@/components/ThesisPreview";
import { DifferentiationToggle } from "@/components/DifferentiationToggle";
import { SloganBanner } from "@/components/site/SloganBanner";
import { Megaphone, Video, Share2, Star, Mail, MousePointerClick, BarChart3 } from "lucide-react";
import { getLang } from "@/lib/i18n";
import { getCopy } from "@/content/site";

export const metadata = { title: "Method" };
export const dynamic = "force-dynamic";

export default async function MethodPage() {
  const lang = await getLang();
  const c = getCopy(lang).method;
  const L = <T,>(en: T, fr: T): T => (lang === "fr" ? fr : en);

  const gates = [
    { h: L("A free assessment", "Une évaluation gratuite"), b: L("We check your website, response times, pricing, reviews and booking channels from the outside, and give you a first estimate of what you're losing. No charge, no obligation.", "Nous examinons votre site, vos temps de réponse, votre tarification, vos avis et vos canaux de réservation depuis l'extérieur, et vous donnons une première estimation de ce que vous perdez. Sans frais, sans obligation.") },
    { h: L("A written Acquisition Thesis", "Une Thèse d'Acquisition écrite"), b: L("Over about two weeks we turn that into a report you own: where you're losing money, how much we can recover, and a 90-day plan. You pay for it and keep it, whether or not you go further.", "En deux semaines environ, nous en faisons un rapport qui vous appartient : où vous perdez de l'argent, combien nous pouvons récupérer, et un plan à 90 jours. Vous le payez et le gardez, que vous alliez plus loin ou non.") },
    { h: L("A mandate — only if it's worth it", "Un mandat — seulement si ça en vaut la peine"), b: L("If the thesis convinces you, we get to work. Part of our fee depends on the extra direct revenue we actually generate.", "Si la thèse vous convainc, nous nous mettons au travail. Une partie de nos honoraires dépend du revenu direct supplémentaire que nous générons réellement.") },
  ];

  const monthlyGroups = [
    {
      icon: MousePointerClick,
      h: L("Your website — the direct channel", "Votre site — le canal direct"),
      items: [
        L("We make it as fast to book on as the OTAs, so you stop losing bookings to a slow page.", "Nous le rendons aussi rapide pour réserver que les OTA, pour que vous cessiez de perdre des réservations à cause d'une page lente."),
        L("We rebuild the booking path so more visitors finish directly, not on a platform.", "Nous refondons le parcours de réservation pour que plus de visiteurs finissent en direct, pas sur une plateforme."),
        L("Retargeting to recover the visitors who left without booking.", "Du retargeting pour récupérer les visiteurs partis sans réserver."),
      ],
    },
    {
      icon: Star,
      h: L("Google & reviews", "Google & avis"),
      items: [
        L("We manage your Google Business Profile, so a search for your hotel ends in a direct booking — not a platform click.", "Nous gérons votre fiche Google Business, pour qu'une recherche de votre hôtel finisse en réservation directe — pas en clic vers une plateforme."),
        L("We monitor and reply to reviews across Google, Booking and TripAdvisor, while they still decide bookings.", "Nous surveillons et répondons aux avis sur Google, Booking et TripAdvisor, tant qu'ils décident encore des réservations."),
      ],
    },
    {
      icon: BarChart3,
      h: L("Rate parity", "Parité tarifaire"),
      items: [
        L("We monitor your prices across every platform, so they never undercut your own site.", "Nous surveillons vos prix sur chaque plateforme, pour qu'ils ne cassent jamais ceux de votre site."),
        L("When a platform is winning a booking you could have kept direct, we close the gap.", "Quand une plateforme gagne une réservation que vous auriez pu garder en direct, nous refermons l'écart."),
      ],
    },
    {
      icon: Video,
      h: L("Conversion video", "Vidéo de conversion"),
      items: [
        L("Short-form video made for one purpose: to turn interest into a direct booking, never just to entertain.", "Vidéo courte faite pour une seule chose : transformer l'intérêt en réservation directe, jamais seulement divertir."),
        L("Every piece points back to your own booking page.", "Chaque contenu renvoie vers votre propre page de réservation."),
        L("A 30-day plan, aimed at bookings — not vanity numbers.", "Un plan sur 30 jours, orienté réservations — pas chiffres de vanité."),
      ],
    },
    {
      icon: Share2,
      h: L("Social channels", "Canaux sociaux"),
      items: [
        L("Publishing across Instagram, Facebook and TikTok, all directing demand to your direct channel.", "Publication sur Instagram, Facebook et TikTok, dirigeant toute la demande vers votre canal direct."),
        L("We reply to every comment and message fast, so warm demand never leaks to a platform.", "Nous répondons vite à chaque commentaire et message, pour que la demande chaude ne fuie jamais vers une plateforme."),
      ],
    },
    {
      icon: Megaphone,
      h: L("Paid acquisition", "Acquisition payante"),
      items: [
        L("Meta Ads — Facebook & Instagram, built and optimised to capture demand before a platform does.", "Meta Ads — Facebook & Instagram, créées et optimisées pour capter la demande avant une plateforme."),
        L("Google Ads — Search and Performance Max, so guests looking for you book with you, not an OTA.", "Google Ads — Search et Performance Max, pour que les clients qui vous cherchent réservent chez vous, pas sur une OTA."),
      ],
    },
    {
      icon: Mail,
      h: L("Email — repeat direct bookings", "Email — réservations directes répétées"),
      items: [
        L("A monthly newsletter to your past guests, bringing them back to book direct.", "Une newsletter mensuelle à vos anciens clients, pour les ramener réserver en direct."),
        L("Automated sequences that turn enquiries into confirmed, commission-free stays.", "Des séquences automatisées qui transforment les demandes en séjours confirmés, sans commission."),
      ],
    },
    {
      icon: BarChart3,
      h: L("Monthly recovery report", "Rapport de récupération mensuel"),
      items: [
        L("A score showing how much direct revenue you're recovering.", "Un score montrant combien de revenu direct vous récupérez."),
        L("A clear figure for what you kept in direct bookings, instead of paying the platforms.", "Un chiffre clair de ce que vous avez gardé en réservations directes, au lieu de payer les plateformes."),
        L("A 90-day plan and a named person you can call.", "Un plan à 90 jours et une personne dédiée que vous pouvez appeler."),
      ],
    },
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
              {L("Three steps. You decide after each one.", "Trois étapes. Vous décidez après chacune.")}
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
              {L("Five places where hotels lose direct bookings.", "Cinq endroits où les hôtels perdent des réservations directes.")}
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
        slogan={L("Software does the measuring. A person checks every number.", "Le logiciel mesure. Une personne vérifie chaque chiffre.")}
      />

      {/* Calculateur illustratif. */}
      <section className="border-b border-gold/15 bg-cream-100/60 py-24 md:py-32">
        <div className="container-editorial">
          <Reveal className="mx-auto mb-12 max-w-2xl text-center">
            <p className="eyebrow">{L("A quick estimate", "Une estimation rapide")}</p>
            <h2 className="mt-4 font-serif text-4xl font-light text-forest-900 md:text-5xl">{L("Estimate your loss in a moment.", "Estimez votre perte en un instant.")}</h2>
          </Reveal>
          <Reveal index={1}><LeakAuditWidget /></Reveal>
        </div>
      </section>

      {/* Le livrable : la Thèse d'Acquisition. */}
      <section className="border-b border-gold/15 py-24 md:py-32">
        <div className="container-editorial grid gap-14 md:grid-cols-[0.95fr_1.05fr] md:items-center">
          <Reveal>
            <p className="eyebrow">{L("The thesis · what you receive", "La thèse · ce que vous recevez")}</p>
            <h2 className="mt-5 font-serif text-4xl font-light leading-tight text-forest-900 md:text-5xl">
              {L("A written report you own — the figures, and a 90-day plan.", "Un rapport écrit qui vous appartient — les chiffres, et un plan à 90 jours.")}
            </h2>
            <div className="mt-7 max-w-prose space-y-5 font-sans text-base leading-relaxed text-forest-800/85">
              <p>{L("This is where the free assessment becomes a document: where you're losing money, area by area, how much we can realistically recover, and exactly how we'll do it over 90 days.", "C'est là où l'évaluation gratuite devient un document : où vous perdez de l'argent, domaine par domaine, combien nous pouvons raisonnablement récupérer, et exactement comment nous nous y prendrons sur 90 jours.")}</p>
              <p>{L("You pay for it and you keep it — whether or not you go on to a mandate.", "Vous le payez et vous le gardez — que vous alliez ensuite vers un mandat ou non.")}</p>
            </div>
          </Reveal>
          <Reveal index={1}><ThesisPreview /></Reveal>
        </div>
      </section>

      {/* Ce que vous recevez chaque mois — la section qui vend. */}
      <section className="border-b border-gold/15 bg-forest-950 py-24 text-cream-50 md:py-32">
        <div className="container-editorial">
          <Reveal className="max-w-3xl">
            <p className="eyebrow text-gold-light">{L("Once your mandate starts", "Une fois votre mandat lancé")}</p>
            <h2 className="mt-5 font-serif text-4xl font-light leading-tight text-cream-50 md:text-5xl">
              {L("We take over every channel where you lose direct revenue.", "Nous prenons en main chaque canal où vous perdez du revenu direct.")}
            </h2>
            <p className="mt-6 max-w-2xl font-sans text-base leading-relaxed text-cream-100/80">
              {L(
                "This isn't a marketing service — it's a recovery operation. We run every conversion channel that decides whether a guest books with you directly or through a platform, and we report all of it in pounds recovered.",
                "Ce n'est pas un service marketing — c'est une opération de récupération. Nous pilotons chaque canal de conversion qui décide si un client réserve chez vous en direct ou via une plateforme, et nous rapportons le tout en livres récupérées.",
              )}
            </p>
          </Reveal>

          <div className="mt-14 grid gap-5 md:grid-cols-2">
            {monthlyGroups.map((g, i) => {
              const Icon = g.icon;
              return (
                <Reveal key={g.h} index={i % 2}>
                  <div className="h-full rounded-2xl border border-cream-50/12 bg-cream-50/[0.04] p-7 transition-colors hover:border-gold/40">
                    <div className="flex items-center gap-4">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gold/15 text-gold-light">
                        <Icon className="h-5 w-5" strokeWidth={1.5} />
                      </span>
                      <h3 className="font-serif text-2xl font-light text-cream-50">{g.h}</h3>
                    </div>
                    <ul className="mt-5 space-y-3">
                      {g.items.map((it, j) => (
                        <li key={j} className="flex gap-3 font-sans text-[0.95rem] leading-relaxed text-cream-100/80">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                          <span>{it}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </Reveal>
              );
            })}
          </div>

          <Reveal index={1}>
            <div className="mt-12 flex flex-col items-start gap-5 rounded-2xl border border-gold/30 bg-gold/[0.06] p-8 md:flex-row md:items-center md:justify-between">
              <p className="max-w-2xl font-serif text-xl font-light italic text-cream-50">
                {L(
                  "All of it, for one monthly fee — plus a share tied to the direct revenue we actually bring back.",
                  "Le tout, pour un seul abonnement mensuel — plus une part liée au revenu direct que nous rapportons réellement.",
                )}
              </p>
              <a href="/diagnostic" className="btn-gold shrink-0">{L("Request an assessment", "Demander une évaluation")}</a>
            </div>
          </Reveal>
        </div>
      </section>

      <SloganBanner
        image="/img/new-banner-reception-gold.jpg"
        slogan={L("Every figure we report, you can check yourself.", "Chaque chiffre que nous rapportons, vous pouvez le vérifier vous-même.")}
      />

      {/* Différenciation. */}
      <section className="py-24 md:py-32">
        <div className="container-editorial">
          <Reveal className="max-w-2xl">
            <p className="eyebrow">{L("Growth or Domination", "Croissance ou Domination")}</p>
            <h2 className="mt-5 font-serif text-4xl font-light text-forest-900 md:text-5xl">
              {L("Two ways to work with us. The difference in one line.", "Deux façons de travailler avec nous. La différence en une ligne.")}
            </h2>
          </Reveal>
          <Reveal index={1} className="mt-12"><DifferentiationToggle /></Reveal>
        </div>
      </section>
    </>
  );
}
