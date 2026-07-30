/**
 * B6 — Route qui GÉNÈRE une Thèse d'Acquisition depuis les données et la sert en HTML premium (PDF).
 * Aujourd'hui : données de démonstration (marquées illustratives). Demain : charger la thèse réelle
 * par `id` depuis Postgres. Le rendu (renderThesisHtml) ne recalcule aucun chiffre.
 */
import { deriveThesisDocument } from "@anesis/planning";
import { gbp, iso } from "@anesis/core";
import { asId } from "@anesis/core/unsafe";
import type { LossLineId, MandateId, ThesisId, UnderwritingThesis } from "@anesis/core";
import { renderThesisHtml } from "@/lib/documents/thesis-html";

export const dynamic = "force-dynamic";

function demoThesis(): UnderwritingThesis {
  const thesisId = asId<ThesisId>("thesis-demo");
  const mandateId = asId<MandateId>("mandate-demo");
  const line = (pillar: string, penceYr: number, rootCause: string) => ({
    id: asId<LossLineId>(`ll-${pillar}`),
    thesisId,
    pillar,
    annualLoss: gbp(penceYr),
    rootCause,
  });
  return {
    id: thesisId,
    mandateId,
    leakIndex: 63,
    createdAt: iso(),
    lossLines: [
      line("ota", 4_860_000, "Two-thirds of room nights clear through OTAs, much of it demand you had already won."),
      line("speed", 3_120_000, "A 5.2s mobile booking path loses one in eight guests at the final step."),
      line("reviews", 1_450_000, "131 reviews unanswered; median reply time of nine days."),
      line("retargeting", 1_230_000, "No retargeting: 98% of site visitors leave and are never brought back."),
      line("social", 980_000, "Instagram last posted 26 days ago; no path from social to a direct booking."),
    ],
  };
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  await ctx.params; // (démo) — plus tard : charger la thèse `id` depuis la base
  const doc = deriveThesisDocument(demoThesis(), {
    propertyName: "Wren & Wold House",
    region: "The Cotswolds",
    formula: "domination",
    termMonths: 6,
  });
  const html = renderThesisHtml(doc, { illustrative: true });
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
}
