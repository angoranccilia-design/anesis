/**
 * Notification — un Event adressé produit des entrées dans les boîtes concernées.
 * Règle : JAMAIS de notification sans action attendue explicite.
 */
import type { AgentId } from "./agent.js";
import type { EventId, Iso8601, NotificationId, OperatorId } from "./primitives.js";

export type NotificationPriority = "low" | "normal" | "high" | "urgent";

export type NotificationRecipient =
  | { readonly kind: "agent"; readonly id: AgentId }
  | { readonly kind: "human"; readonly id: OperatorId };

export interface Notification {
  readonly id: NotificationId;
  readonly eventId: EventId; // dérivée d'un Event adressé
  readonly recipient: NotificationRecipient;
  readonly what: string;
  readonly why: string;
  readonly expectedAction: string; // non vide — l'action attendue
  readonly deadline: Iso8601 | null;
  readonly contextLink: string;
  readonly priority: NotificationPriority;
  readonly readAt: Iso8601 | null;
  readonly actedAt: Iso8601 | null;
}
