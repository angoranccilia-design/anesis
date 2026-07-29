import { describe, expect, it, vi } from "vitest";
import type { Mailer } from "@anesis/auth";
import { generateCampaignEmail, sendCampaignEmail } from "../email.js";

const QUALIFIED = { propertyName: "The Cotswold Mill", leakIndex: 71, monthlyLossPence: 740_000, decisionCode: "QUALIFIED" };

describe("génération d'email de campagne (Porte 1)", () => {
  it("objet : nom de l'établissement + perte mensuelle en £", () => {
    const { subject } = generateCampaignEmail(QUALIFIED);
    expect(subject).toContain("The Cotswold Mill");
    expect(subject).toContain("£7,400/month");
  });

  it("corps : décrit le score par son nom complet et le montant figé, sans le recalculer", () => {
    const { body } = generateCampaignEmail(QUALIFIED);
    expect(body).toContain("Anesis Revenue Leak Index");
    expect(body).toContain("71/100");
    expect(body).toContain("£7,400");
    expect(body).toContain("free");
  });

  it("en-GB, £ jamais $ ; aucune mention de mandat signé ou de paiement", () => {
    const { subject, body } = generateCampaignEmail(QUALIFIED);
    expect(subject + body).not.toContain("$");
    expect(body.toLowerCase()).not.toContain("invoice");
    expect(body.toLowerCase()).not.toContain("payment");
  });

  it("données publiques insuffisantes → AUCUN chiffre inventé, objet neutre", () => {
    const { subject, body } = generateCampaignEmail({
      propertyName: "Ards Priory",
      leakIndex: 0,
      monthlyLossPence: 0,
      decisionCode: "INSUFFICIENT_PUBLIC_DATA",
    });
    expect(subject).toContain("a free look");
    expect(subject).not.toContain("£");
    expect(body).toContain("won't invent one");
    expect(body).toContain("free");
  });

  it("salutation personnalisée si prénom fourni, neutre sinon", () => {
    expect(generateCampaignEmail({ ...QUALIFIED, recipientName: "Jane" }).body).toContain("Dear Jane,");
    expect(generateCampaignEmail(QUALIFIED).body).toContain("Dear owner,");
  });
});

describe("envoi via le mailer partagé", () => {
  it("sendCampaignEmail délègue à mailer.send avec objet, corps et reply-to", async () => {
    const send = vi.fn(async () => {});
    const mailer = { mode: "noop", send, sendMagicLink: async () => {} } as unknown as Mailer;
    const email = generateCampaignEmail(QUALIFIED);
    await sendCampaignEmail(mailer, "owner@millhotel.co.uk", email, { replyTo: "enquiries@anesisacquisition.com" });
    expect(send).toHaveBeenCalledWith("owner@millhotel.co.uk", email.subject, email.body, { replyTo: "enquiries@anesisacquisition.com" });
  });
});
