import { PageHeader } from "@/components/site/PageHeader";
import { Reveal } from "@/components/Reveal";
import { EnquiryForm } from "@/components/EnquiryForm";

export const metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <>
      <PageHeader
        eyebrow="Contact"
        title="Write to us yourself."
        lede="You’ll hear back from someone who understands hospitality — not a queue, and never a script."
      />
      <section className="py-20 md:py-28">
        <div className="container-editorial grid gap-14 md:grid-cols-[0.85fr_1.15fr] md:items-start">
          <Reveal>
            <p className="eyebrow">Directly</p>
            <ul className="mt-4 space-y-3 font-sans text-base text-forest-800/85">
              <li>
                <a href="mailto:enquiries@anesisacquisition.com" className="link-underline">
                  enquiries@anesisacquisition.com
                </a>
              </li>
              <li className="text-forest-800/70">United Kingdom</li>
            </ul>
            <p className="mt-8 max-w-prose font-sans text-sm leading-relaxed text-forest-800/70">
              Whether it’s a first enquiry or a considered question, the same person reads it. Tell us
              about your hotel, and where you suspect the leak is.
            </p>
          </Reveal>
          <Reveal index={1}>
            <EnquiryForm kind="contact" />
          </Reveal>
        </div>
      </section>
    </>
  );
}
