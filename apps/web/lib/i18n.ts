import "server-only";
import { cookies } from "next/headers";

/** Langues du site : anglais UK (défaut) + français (France). */
export type Lang = "en" | "fr";

export const LANGS: readonly Lang[] = ["en", "fr"];
export const DEFAULT_LANG: Lang = "en";
export const LANG_COOKIE = "lang";

/** Langue courante, lue depuis le cookie (défaut EN). Rend les pages dynamiques — voulu. */
export async function getLang(): Promise<Lang> {
  const v = (await cookies()).get(LANG_COOKIE)?.value;
  return v === "fr" ? "fr" : "en";
}

/** Choisit la variante d'un couple {en, fr}. */
export const t = <T,>(lang: Lang, pair: Record<Lang, T>): T => pair[lang];
