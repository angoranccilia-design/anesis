import { Hero } from "@/components/Hero";
import { HERO_PAGES } from "@/lib/hero-content";
import { Reveal } from "@/components/Reveal";
import { getLang } from "@/lib/i18n";
import { getCopy } from "@/content/site";

export const metadata = { title: "About" };
export const dynamic = "force-dynamic";

export default async function AboutPage() {
  const lang = await getLang();
  const c = getCopy(lang).about;

  return (
    <>
      <Hero {...HERO_PAGES.about} hideNav />

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
    </>
  );
}
