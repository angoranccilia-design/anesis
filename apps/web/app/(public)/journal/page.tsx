import Link from "next/link";
import Image from "next/image";
import { Reveal } from "@/components/Reveal";
import { ARTICLES, ISSUE } from "@/content/journal";
import { getLang } from "@/lib/i18n";
import { getCopy } from "@/content/site";

export const metadata = {
  title: "The Anesis Journal",
  description: "A monthly reckoning of where independent hotels lose money — and what an underwriter's eye sees.",
};
export const dynamic = "force-dynamic";

export default async function JournalPage() {
  const lang = await getLang();
  const j = getCopy(lang).journal;
  const L = <T,>(en: T, fr: T): T => (lang === "fr" ? fr : en);
  const lead = ARTICLES.find((a) => a.lead) ?? ARTICLES[0]!;
  const rest = ARTICLES.filter((a) => a.slug !== lead.slug);

  return (
    <>
      {/* ── Masthead ─────────────────────────────────────────────────────────── */}
      <section className="pt-36 pb-10">
        <div className="container-editorial text-center">
          <Image src="/logo.png" alt="Anesis Acquisition" width={120} height={120} className="mx-auto h-16 w-16 object-contain" />
          <h1 className="mt-4 font-serif text-5xl font-light tracking-tight text-forest-900 md:text-7xl">The Anesis Journal</h1>
          <div className="mt-4 flex items-center justify-center gap-4 font-sans text-[0.7rem] uppercase tracking-eyebrow text-gold-deep">
            <span>{ISSUE.volume}</span>
            <span className="h-1 w-1 rounded-full bg-gold" />
            <span>{ISSUE.label}</span>
            <span className="h-1 w-1 rounded-full bg-gold" />
            <span>{L("Hospitality Underwriting", "Souscription hôtelière")}</span>
          </div>
          <div className="mx-auto mt-6 h-px w-full max-w-3xl bg-forest-900/25" />
          <p className="mx-auto mt-6 max-w-2xl font-serif text-xl font-light italic leading-relaxed text-forest-800/80">
            {L(
              "Written this month with the rigour of a broadsheet, not the haste of a blog — on where the money quietly leaves a hotel of character, and what is recoverable.",
              "Écrit ce mois-ci avec la rigueur d'un grand quotidien, non la hâte d'un blog — sur les endroits où l'argent quitte discrètement un hôtel de caractère, et ce qui est récupérable.",
            )}
          </p>
          <p className="mt-4 font-sans text-xs text-forest-800/55">{j.note}</p>
        </div>
      </section>

      {/* ── Lead ─────────────────────────────────────────────────────────────── */}
      <section className="border-y border-forest-900/15 py-16">
        <div className="container-editorial">
          <Reveal>
            <Link href={`/journal/${lead.slug}`} className="group block">
              <p className="eyebrow">{j.lead}</p>
              <h2 className="mt-4 max-w-4xl font-serif text-4xl font-light leading-[1.1] text-forest-900 transition-colors group-hover:text-forest-950 md:text-6xl">
                {lead.title}
              </h2>
              <p className="mt-5 max-w-2xl font-serif text-xl font-light italic text-forest-800/80">{lead.dek}</p>
              <p className="mt-5 font-sans text-sm text-gold-deep">{lead.readMinutes} {j.read}</p>
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ── Column ───────────────────────────────────────────────────────────── */}
      <section className="py-16 md:py-24">
        <div className="container-editorial">
          <div className="grid gap-x-14 gap-y-12 md:grid-cols-3">
            {rest.map((a, i) => (
              <Reveal key={a.slug} index={i}>
                <Link href={`/journal/${a.slug}`} className="group flex h-full flex-col border-t border-forest-900/15 pt-6">
                  <p className="eyebrow">{a.readMinutes} min</p>
                  <h3 className="mt-3 font-serif text-2xl font-light leading-snug text-forest-900 transition-colors group-hover:text-gold-deep">
                    {a.title}
                  </h3>
                  <p className="mt-3 font-sans text-sm leading-relaxed text-forest-800/80">{a.dek}</p>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
