/**
 * Marque ANESIS — source unique pour les documents (emails, Thèse, lettres, contrats).
 * `logoUrl` pointe vers le logo transparent hébergé (apps/web/public/logo.png → /logo.png).
 * Hôte réel à confirmer quand le domaine sera acquis ; surcouchable par un paramètre de rendu.
 */
export const BRAND = {
  name: "Anesis Acquisition",
  tagline: "Hospitality acquisition underwriting — United Kingdom",
  fromEmail: "enquiries@anesisacquisition.com",
  /** Logo transparent (500×500 PNG). Chemin public sur le site : /logo.png. */
  logoUrl: "https://anesisacquisition.com/logo.png",
} as const;

export type BrandInfo = typeof BRAND;
