import { randomUUID } from "node:crypto";
import type { EventId } from "@anesis/core";
import type { AgentContext } from "./types.js";

export const uid = (prefix: string): string => `${prefix}-${randomUUID()}`;

/** Crée une notification adressée (jamais sans action attendue) reliée à un événement. */
export async function notify(
  ctx: AgentContext,
  eventId: EventId,
  n: { what: string; why: string; expectedAction: string; deadline?: string | null; priority?: string },
): Promise<void> {
  await ctx.client.query(
    `insert into notifications (id, event_id, mandate_id, recipient, what, why, expected_action, deadline, context_link, priority)
     values ($1, $2, $3, $4::jsonb, $5, $6, $7, $8, $9, $10)`,
    [
      uid("notif"),
      eventId,
      ctx.mandateId,
      JSON.stringify({ kind: "human", id: "op-cecilia" }),
      n.what,
      n.why,
      n.expectedAction,
      n.deadline ?? null,
      "/mandates",
      n.priority ?? "normal",
    ],
  );
}
