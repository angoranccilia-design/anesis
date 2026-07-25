import { PageHeader } from "@/components/site/PageHeader";

export const metadata = { title: "Journal" };

export default function JournalPage() {
  return (
    <>
      <PageHeader
        eyebrow="The journal"
        title="Notes from a firm that underwrites hospitality."
        lede="Plainly-written pieces on where independent hotels lose money — and what an underwriter’s eye sees that a marketer’s doesn’t."
      />
      <section className="py-24">
        <div className="container-editorial max-w-prose space-y-6 font-sans text-base leading-relaxed text-forest-800/85">
          <p>Launch essays to follow, written in the firm’s voice (MDX).</p>
        </div>
      </section>
    </>
  );
}
