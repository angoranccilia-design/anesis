import Image from "next/image";
import { Reveal } from "@/components/Reveal";

/**
 * En-tête de page intérieure. Deux traitements : sobre (crème/encre verte) par défaut, ou bandeau
 * PHOTO pleine largeur si `image` est fourni (texte clair sur overlay encre verte).
 */
export function PageHeader({
  eyebrow,
  title,
  lede,
  image,
}: {
  eyebrow: string;
  title: string;
  lede?: string;
  image?: string;
}) {
  if (image) {
    return (
      <section className="full-banner pt-24">
        <Image src={image} alt="" fill priority className="full-banner-img" sizes="100vw" />
        <div className="container-editorial relative py-24 text-cream-50">
          <Reveal>
            <p className="font-sans text-[0.7rem] uppercase tracking-eyebrow text-gold-light">{eyebrow}</p>
            <h1 className="mt-5 max-w-4xl font-serif text-5xl font-light leading-[1.05] md:text-6xl">{title}</h1>
            {lede ? <p className="mt-7 max-w-2xl font-sans text-lg leading-relaxed text-cream-100/90">{lede}</p> : null}
          </Reveal>
        </div>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden border-b border-gold/15 pt-40 pb-20">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_0%,rgba(176,141,76,0.10),transparent_55%)]" />
      <div className="container-editorial relative">
        <Reveal>
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="mt-5 max-w-4xl font-serif text-5xl font-light leading-[1.06] text-forest-900 md:text-6xl">{title}</h1>
          {lede ? <p className="mt-7 max-w-2xl font-sans text-lg leading-relaxed text-forest-800/80">{lede}</p> : null}
        </Reveal>
      </div>
    </section>
  );
}
