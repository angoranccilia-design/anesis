import { PageHeader } from "@/components/site/PageHeader";
import { Reveal } from "@/components/Reveal";
import { EnquiryForm } from "@/components/EnquiryForm";

export const metadata = { title: "Request an assessment" };

export default function DiagnosticPage() {
  return (
    <>
      <PageHeader
        eyebrow="Gate one · free"
        title="Request your assessment."
        lede="Tell us where to look. We measure your recoverable loss from your real data and write back with a figure — plainly, and at no cost."
      />
      <section className="py-20 md:py-28">
        <div className="container-editorial grid gap-14 md:grid-cols-[0.85fr_1.15fr] md:items-start">
          <Reveal>
            <div className="max-w-prose space-y-5 font-sans text-base leading-relaxed text-forest-800/85">
              <p>
                The assessment is grounded in your real data — your website, your reviews, your channel
                mix, your social presence. It costs nothing, and it commits you to nothing.
              </p>
              <p>
                If there isn’t enough recoverable loss to be worth either of our time, we’ll tell you so.
                We refuse more hotels than we accept.
              </p>
            </div>
          </Reveal>
          <Reveal index={1}>
            <EnquiryForm kind="assessment" />
          </Reveal>
        </div>
      </section>
    </>
  );
}
