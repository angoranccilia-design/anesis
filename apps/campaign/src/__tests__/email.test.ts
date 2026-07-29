import { describe, expect, it, vi } from "vitest";
import type { Mailer } from "@anesis/auth";
import { generateCampaignEmail, sendCampaignEmail } from "../email.js";

const QUALIFIED = { propertyName: "The Cotswold Mill", leakIndex: 71, monthlyLossPence: 740_000, decisionCode: "QUALIFIED" };

describe("génération d'email de campagne (Porte 1)", () => {
  it("objet : perte mensuelle en £ + nom de l'établissement", () => {
    const { subject } = generateCampaignEmail(QUALIFIED);
    expect(subject).toContain("The Cotswold Mill");
    expect(subject).toContain("£7,400/month");
  });

  it("texte : décrit le score par son nom complet et le montant figé, offre gratuite, une seule demande", () => {
    const { text } = generateCampaignEmail(QUALIFIED);
    expect(text).toContain("Anesis Revenue Leak Index");
    expect(text).toContain("71/100");
    expect(text).toContain("£7,400");
    expect(text.toLowerCase()).toContain("no cost");
    expect((text.match(/one-line reply/g) ?? []).length).toBe(2); // CTA + opt-out uniquement
  });

  it("en-GB, £ jamais $ ; aucune mention de mandat signé ou de paiement", () => {
    const { subject, text } = generateCampaignEmail(QUALIFIED);
    expect(subject + text).not.toContain("$");
    expect(text.toLowerCase()).not.toContain("invoice");
    expect(text.toLowerCase()).not.toContain("payment");
  });

  it("HTML : logo transparent en en-tête + corps ; logoUrl surcouchable", () => {
    const def = generateCampaignEmail(QUALIFIED);
    expect(def.html).toContain("<img");
    expect(def.html).toContain("https://anesisacquisition.com/logo.png");
    expect(def.html).toContain("The Cotswold Mill");
    const custom = generateCampaignEmail({ ...QUALIFIED, logoUrl: "https://cdn.example/logo.png" });
    expect(custom.html).toContain("https://cdn.example/logo.png");
  });

  it("données publiques insuffisantes → AUCUN chiffre inventé, objet neutre", () => {
    const { subject, text } = generateCampaignEmail({
      propertyName: "Ards Priory",
      leakIndex: 0,
      monthlyLossPence: 0,
      decisionCode: "INSUFFICIENT_PUBLIC_DATA",
    });
    expect(subject).toContain("free look");
    expect(subject).not.toContain("£");
    expect(text).toContain("won't invent one");
  });

  it("salutation personnalisée si prénom fourni, neutre sinon", () => {
    expect(generateCampaignEmail({ ...QUALIFIED, recipientName: "Jane" }).text).toContain("Dear Jane,");
    expect(generateCampaignEmail(QUALIFIED).text).toContain("Dear owner,");
  });
});

describe("envoi via le mailer partagé", () => {
  it("sendCampaignEmail délègue à mailer.send avec texte, HTML et reply-to", async () => {
    const send = vi.fn(async () => {});
    const mailer = { mode: "noop", send, sendMagicLink: async () => {} } as unknown as Mailer;
    const email = generateCampaignEmail(QUALIFIED);
    await sendCampaignEmail(mailer, "owner@millhotel.co.uk", email, { replyTo: "enquiries@anesisacquisition.com" });
    expect(send).toHaveBeenCalledWith("owner@millhotel.co.uk", email.subject, email.text, {
      replyTo: "enquiries@anesisacquisition.com",
      html: email.html,
    });
  });
});
