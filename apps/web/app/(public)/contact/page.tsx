import { Hero } from "@/components/Hero";
import { HERO_PAGES } from "@/lib/hero-content";
import { Reveal } from "@/components/Reveal";
import { EnquiryForm } from "@/components/EnquiryForm";
import { getLang } from "@/lib/i18n";
import { getCopy } from "@/content/site";

export const metadata = { title: "Contact" };
export const dynamic = "force-dynamic";

export default async function ContactPage() {
  const lang = await getLang();
  const c = getCopy(lang);
  const ct = c.contact;
  const L = <T,>(en: T, fr: T): T => (lang === "fr" ? fr : en);

  return (
    <>
      <Hero {...HERO_PAGES.contact} hideNav />
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
    </>
  );
}
