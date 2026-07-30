import { Hero } from "@/components/Hero";
import { HERO_PAGES } from "@/lib/hero-content";
import { Reveal } from "@/components/Reveal";
import { EnquiryForm } from "@/components/EnquiryForm";
import { getLang } from "@/lib/i18n";
import { getCopy } from "@/content/site";

export const metadata = { title: "Request an assessment" };
export const dynamic = "force-dynamic";

export default async function DiagnosticPage() {
  const lang = await getLang();
  const c = getCopy(lang);
  const d = c.diagnostic;
  const L = <T,>(en: T, fr: T): T => (lang === "fr" ? fr : en);

  return (
    <>
      <Hero {...HERO_PAGES.diagnostic} hideNav />
      <section className="py-20 md:py-28">
        <div className="container-editorial grid gap-14 md:grid-cols-[0.85fr_1.15fr] md:items-start">
          <Reveal>
            <div className="max-w-prose space-y-5 font-sans text-base leading-relaxed text-forest-800/85">
              <p>{L("The assessment is grounded in your real data — your website, your reviews, your channel mix, your social presence. It costs nothing, and it commits you to nothing.", "L'évaluation se fonde sur vos données réelles — votre site, vos avis, votre mix de canaux, votre présence sociale. Elle ne coûte rien et ne vous engage à rien.")}</p>
              <p>{L("If there isn't enough recoverable loss to be worth either of our time, we'll tell you so. We refuse more hotels than we accept.", "S'il n'y a pas assez de perte récupérable pour que cela vaille notre temps à tous deux, nous vous le dirons. Nous refusons plus d'hôtels que nous n'en acceptons.")}</p>
            </div>
          </Reveal>
          <Reveal index={1}>
            <EnquiryForm kind="assessment" labels={c.form} />
          </Reveal>
        </div>
      </section>
    </>
  );
}
