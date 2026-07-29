/** Formatage £ à partir de pence (en-GB, sans décimales pour les gros montants). */
export const poundsFromPence = (pence: number): string =>
  `£${Math.round(pence / 100).toLocaleString("en-GB")}`;

export const pct = (fraction: number): string => `${Math.round(fraction * 100)}%`;

export const FORMULA_LABEL: Record<"growth" | "domination", string> = {
  growth: "Growth",
  domination: "Domination",
};
