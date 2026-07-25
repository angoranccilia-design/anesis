import { PageHeader } from "@/components/site/PageHeader";

export const metadata = { title: "Results" };

export default function ResultsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Track record · North America"
        title="What the method has returned, before its first UK mandate."
        lede="Our founder’s record was built in North America. We show it clearly labelled, and we don’t borrow it to imply UK results we haven’t earned yet."
      />
      <section className="py-24">
        <div className="container-editorial max-w-prose space-y-6 font-sans text-base leading-relaxed text-forest-800/85">
          <p>Full page to follow — the trajectory chart (baseline vs. recovered) and clearly-labelled case figures.</p>
        </div>
      </section>
    </>
  );
}
