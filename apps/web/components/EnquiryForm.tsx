"use client";

import { useState } from "react";

/**
 * Formulaire d'enquête (Diagnostic Porte 1 / Contact). Validation côté client, envoi vers /api/enquiry
 * (qui notifie via Resend + persiste si la base est configurée). Libellés bilingues via `labels`.
 */
type Status = "idle" | "sending" | "sent" | "error";

export interface EnquiryLabels {
  name: string;
  email: string;
  hotel: string;
  website: string;
  submit: string;
  send: string;
  sending: string;
  msgAssessment: string;
  msgContact: string;
  receivedLabel: string;
  receivedTitle: string;
  receivedSub: string;
  err: string;
}

const EN: EnquiryLabels = {
  name: "Your name", email: "Email", hotel: "Hotel", website: "Website",
  submit: "Request my assessment", send: "Send", sending: "Sending…",
  msgAssessment: "Anything we should know before we look?", msgContact: "How can we help?",
  receivedLabel: "Received", receivedTitle: "Thank you — your note is with us.",
  receivedSub: "You'll hear back from someone who understands hospitality, and soon.",
  err: "Something went wrong — please try again, or email us directly.",
};

export function EnquiryForm({ kind, labels = EN }: { kind: "assessment" | "contact"; labels?: EnquiryLabels }) {
  const [status, setStatus] = useState<Status>("idle");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    try {
      const res = await fetch("/api/enquiry", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind, ...data }),
      });
      if (!res.ok) throw new Error("failed");
      setStatus("sent");
      form.reset();
    } catch {
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div className="rounded-2xl border border-gold/30 bg-cream-100 p-10 text-center">
        <p className="eyebrow">{labels.receivedLabel}</p>
        <p className="mt-3 font-serif text-2xl font-light text-forest-900">{labels.receivedTitle}</p>
        <p className="mt-3 font-sans text-sm text-forest-800/75">{labels.receivedSub}</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-forest-900/15 bg-cream-50 p-8 md:p-10">
      <div className="grid gap-6 md:grid-cols-2">
        <Field name="name" label={labels.name} required />
        <Field name="hotel" label={labels.hotel} required />
        <Field name="email" label={labels.email} type="email" required />
        <Field name="website" label={labels.website} type="url" placeholder="https://" />
      </div>
      <div className="mt-6">
        <label htmlFor="message" className="font-sans text-sm text-forest-800/85">
          {kind === "assessment" ? labels.msgAssessment : labels.msgContact}
        </label>
        <textarea
          id="message"
          name="message"
          rows={4}
          className="mt-2 w-full rounded-lg border border-forest-900/20 bg-cream-50 px-4 py-3 font-sans text-sm text-forest-900 outline-none transition-colors focus:border-gold"
        />
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-5">
        <button
          type="submit"
          disabled={status === "sending"}
          className="rounded-full bg-forest-900 px-7 py-3.5 font-sans text-sm font-medium text-cream-50 transition-colors hover:bg-forest-800 disabled:opacity-60"
        >
          {status === "sending" ? labels.sending : kind === "assessment" ? labels.submit : labels.send}
        </button>
        {status === "error" && <p className="font-sans text-sm text-forest-800/80">{labels.err}</p>}
      </div>
    </form>
  );
}

function Field({
  name,
  label,
  type = "text",
  required = false,
  placeholder,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="font-sans text-sm text-forest-800/85">
        {label} {required && <span className="text-gold-deep">·</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="mt-2 w-full rounded-lg border border-forest-900/20 bg-cream-50 px-4 py-3 font-sans text-sm text-forest-900 outline-none transition-colors focus:border-gold"
      />
    </div>
  );
}
