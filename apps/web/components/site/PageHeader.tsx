import { Reveal } from "@/components/Reveal";

/** En-tête de page intérieure — même grammaire visuelle que le hero, en plus sobre. */
export function PageHeader({ eyebrow, title, lede }: { eyebrow: string; title: string; lede?: string }) {
  return (
    <section className="relative overflow-hidden border-b border-gold/10 pt-40 pb-20">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_10%,rgba(176,141,76,0.10),transparent_50%)]" />
      <div className="container-editorial relative">
        <Reveal>
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="mt-5 max-w-4xl font-serif text-5xl font-light leading-[1.05] text-cream-50 md:text-6xl">
            {title}
          </h1>
          {lede ? (
            <p className="mt-7 max-w-2xl font-sans text-lg leading-relaxed text-cream-100/80">{lede}</p>
          ) : null}
        </Reveal>
      </div>
    </section>
  );
}
