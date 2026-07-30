import { Hero } from "@/components/Hero";
import { getHero } from "@/lib/hero-content";
import { Reveal } from "@/components/Reveal";
import { EnquiryForm } from "@/components/EnquiryForm";
import { SloganBanner } from "@/components/site/SloganBanner";
import { getLang } from "@/lib/i18n";
import { getCopy } from "@/content/site";

export const metadata = { title: "Contact" };
export const dynamic = "force-dynamic";

export default async function ContactPage() {
  const lang = await getLang();
  const c = getCopy(lang);
  const ct = c.contact;
  const L = <T,>(en: T, fr: T): T => (lang === "fr" ? fr : en);

  const faq = [
    { q: L("What does the first assessment cost?", "Combien coûte la première évaluation ?"), a: L("Nothing. We read your hotel from the outside and give you a first sense of the leak, with no obligation to go further.", "Rien. Nous lisons votre hôtel de l'extérieur et vous donnons un premier ordre de grandeur de la fuite, sans obligation d'aller plus loin.") },
    { q: L("Am I signing anything by writing to you?", "Est-ce que j'engage quoi que ce soit en vous écrivant ?"), a: L("No. A first enquiry commits you to nothing. A mandate only exists later, in writing, once a thesis has convinced you.", "Non. Une première demande ne vous engage à rien. Un mandat n'existe que plus tard, par écrit, une fois qu'une thèse vous a convaincu.") },
    { q: L("How are you paid?", "Comment êtes-vous rémunérés ?"), a: L("On the gap we actually close — the direct revenue recovered — plus a monthly subscription. Never on how much you spend on advertising.", "Sur l'écart que nous refermons réellement — le revenu direct récupéré — plus un abonnement mensuel. Jamais sur ce que vous dépensez en publicité.") },
    { q: L("Do you take every hotel that asks?", "Prenez-vous tous les hôtels qui le demandent ?"), a: L("No. If we can't see a leak worth recovering, we say so and decline. We only take mandates we can be honest about.", "Non. Si nous ne voyons pas de fuite qui vaille la peine d'être récupérée, nous le disons et nous déclinons. Nous ne prenons que des mandats sur lesquels nous pouvons être honnêtes.") },
    { q: L("How long is a mandate?", "Quelle est la durée d'un mandat ?"), a: L("Six or twelve months — your choice. The incentive rate follows the duration you pick.", "Six ou douze mois — à votre choix. Le taux d'intéressement suit la durée que vous choisissez.") },
    { q: L("What access will you need?", "De quels accès aurez-vous besoin ?"), a: L("Once a mandate begins, your booking channels, Google Business Profile, review platforms and social accounts — so we can work on the leak directly. Never before.", "Une fois le mandat commencé, vos canaux de réservation, votre fiche Google Business, vos plateformes d'avis et vos comptes sociaux — pour agir directement sur la fuite. Jamais avant.") },
    { q: L("How quickly will I hear back?", "Sous quel délai aurai-je une réponse ?"), a: L("A person reads every enquiry — never a queue. You'll hear back within two working days.", "Une personne lit chaque demande — jamais une file d'attente. Vous aurez une réponse sous deux jours ouvrés.") },
    { q: L("Do you work outside the UK?", "Travaillez-vous hors du Royaume-Uni ?"), a: L("We focus on independent hotels of character in the United Kingdom.", "Nous nous concentrons sur les hôtels de caractère indépendants au Royaume-Uni.") },
  ];

  return (
    <>
      <Hero {...getHero(lang, "contact")} hideNav />

      <SloganBanner
        image="/img/new-hotel-hall-chandelier.jpg"
        slogan={L("Write once. A person reads it — never a queue.", "Écrivez une fois. Une personne lit — jamais une file d'attente.")}
      />
      <section className="py-20 md:py-28">
        <div className="container-editorial grid gap-14 md:grid-cols-[0.85fr_1.15fr] md:items-start">
          <Reveal>
            <p className="eyebrow">{L("Directly", "Directement")}</p>
            <ul className="mt-4 space-y-3 font-sans text-base text-forest-800/85">
              <li><a href="mailto:enquiries@anesisacquisition.com" className="link-underline">enquiries@anesisacquisition.com</a></li>
              <li className="text-forest-800/70">{c.footer.country}</li>
            </ul>
            <p className="mt-8 max-w-prose font-sans text-sm leading-relaxed text-forest-800/70">
              {L("Whether it's a first enquiry or a considered question, the same person reads it. Tell us about your hotel, and where you suspect the leak is.", "Qu'il s'agisse d'une première demande ou d'une question mûrie, la même personne la lit. Parlez-nous de votre hôtel, et de l'endroit où vous soupçonnez la fuite.")}
            </p>
          </Reveal>
          <Reveal index={1}>
            <EnquiryForm kind="contact" labels={c.form} />
          </Reveal>
        </div>
      </section>

      {/* FAQ. */}
      <section className="border-t border-gold/15 py-24 md:py-32">
        <div className="container-editorial">
          <Reveal className="max-w-2xl">
            <p className="eyebrow">{L("Before you write", "Avant d'écrire")}</p>
            <h2 className="mt-5 font-serif text-4xl font-light text-forest-900 md:text-5xl">
              {L("Questions we're usually asked first.", "Les questions qu'on nous pose d'abord.")}
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-x-14 gap-y-10 md:grid-cols-2">
            {faq.map((f, i) => (
              <Reveal key={i} index={i % 2}>
                <div className="border-t border-forest-900/12 pt-6">
                  <h3 className="font-serif text-xl font-light text-forest-900">{f.q}</h3>
                  <p className="mt-3 max-w-prose font-sans text-base leading-relaxed text-forest-800/85">{f.a}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
