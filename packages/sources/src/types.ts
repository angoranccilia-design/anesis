import type { RawObservations } from "@anesis/assessment";
import type { HttpClient } from "./http.js";

export interface PropertyRef {
  readonly id: string;
  readonly name: string;
  readonly website: string | null;
}

export interface SourceContext {
  readonly http: HttpClient;
}

/**
 * Une source de signaux : contribue une PARTIE des observations brutes. Chacune est indépendante et
 * testable seule ; une source qui échoue n'empêche pas les autres (voir compose).
 */
export interface SignalSource {
  readonly name: string;
  collect(property: PropertyRef, ctx: SourceContext): Promise<Partial<RawObservations>>;
}
