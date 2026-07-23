/**
 * Bus d'événements au-dessus de la table `events` (append-only = SOURCE DE VÉRITÉ).
 * - Abonnements par `type`.
 * - Livraison IDEMPOTENTE : clé (eventId, subscriber) dans `processed_events` ; l'effet de bord de
 *   l'abonné et son marquage sont dans la MÊME transaction → un événement livré deux fois ne produit
 *   son effet qu'une fois (exactly-once effect).
 * - CONTEXTE DE MANDAT : avant chaque `handle()`, le bus pose `app.mandate_id` (transaction-local)
 *   à partir de `event.mandateId`, de sorte que les écritures RLS-scopées de l'abonné passent la police.
 * - Rejeu depuis la table : ré-applique uniquement les effets manquants (idempotence).
 *
 * DÉCISION D'ARCHITECTURE — portée de `events` et `processed_events` :
 * ces deux tables sont des tables SYSTÈME (journal global + bus), volontairement SANS RLS par mandat.
 * `EventBus` est donc un composant SYSTÈME, opéré par le worker/orchestrateur — jamais instancié ni lu
 * par du code agissant au nom d'un mandat précis. `replay()`/`dispatch()` peuvent voir les événements
 * de TOUS les mandats ; c'est intentionnel et réservé au processus système. Le bus rétablit lui-même
 * le contexte de mandat par événement pour que les EFFETS des abonnés restent isolés.
 * Deux tests gardent cette décision : `mandate-context.test.ts` (les effets passent la RLS) et
 * `events-scope.test.ts` (events est bien global + aucun paquet mandat-facing n'appelle `replay`).
 */
import type { DomainEvent, EventPayloadMap, EventType } from "@anesis/core";
import type { SqlClient } from "@anesis/db";

export interface EventHandlerContext {
  /** Le même client/transaction que le marquage d'idempotence : l'effet de bord est atomique avec lui. */
  readonly client: SqlClient;
  readonly event: DomainEvent;
}

export interface Subscriber {
  readonly name: string;
  readonly types: readonly EventType[];
  handle(ctx: EventHandlerContext): Promise<void>;
}

interface EventRow {
  id: string;
  type: string;
  payload: unknown;
  mandate_id: string | null;
  emitted_by: string;
  emitted_at: string | Date;
  audience: unknown;
  correlation_id: string;
}

const rowToEvent = (r: EventRow): DomainEvent => ({
  id: r.id as DomainEvent["id"],
  type: r.type as EventType,
  payload: r.payload as EventPayloadMap[EventType],
  mandateId: r.mandate_id as DomainEvent["mandateId"],
  emittedBy: r.emitted_by as DomainEvent["emittedBy"],
  emittedAt: (r.emitted_at instanceof Date ? r.emitted_at.toISOString() : r.emitted_at) as DomainEvent["emittedAt"],
  audience: r.audience as DomainEvent["audience"],
  correlationId: r.correlation_id as DomainEvent["correlationId"],
});

export class EventBus {
  private readonly subscribers: Subscriber[] = [];

  constructor(private readonly client: SqlClient) {}

  subscribe(subscriber: Subscriber): void {
    this.subscribers.push(subscriber);
  }

  /** Persiste l'événement dans la table append-only (source de vérité). */
  async append(event: DomainEvent): Promise<void> {
    await this.client.query(
      `insert into events (id, type, payload, mandate_id, emitted_by, emitted_at, audience, correlation_id)
       values ($1, $2, $3::jsonb, $4, $5, $6, $7::jsonb, $8)`,
      [
        event.id,
        event.type,
        JSON.stringify(event.payload),
        event.mandateId,
        event.emittedBy,
        event.emittedAt,
        JSON.stringify(event.audience),
        event.correlationId,
      ],
    );
  }

  /** Publie = append (source de vérité) puis dispatch immédiat. */
  async publish(event: DomainEvent): Promise<void> {
    await this.append(event);
    await this.dispatch(event);
  }

  async dispatch(event: DomainEvent): Promise<void> {
    for (const sub of this.subscribers) {
      if (sub.types.includes(event.type)) {
        await this.deliver(event, sub);
      }
    }
  }

  private async deliver(event: DomainEvent, sub: Subscriber): Promise<void> {
    await this.client.query("begin");
    try {
      // Contexte de mandat AVANT handle() : les écritures RLS-scopées de l'abonné doivent voir
      // current_mandate() = event.mandateId. Transaction-local, réinitialisé au COMMIT/ROLLBACK.
      if (event.mandateId !== null) {
        await this.client.query("select set_config('app.mandate_id', $1, true)", [event.mandateId]);
      }
      const { rows } = await this.client.query(
        "select 1 from processed_events where event_id = $1 and subscriber = $2",
        [event.id, sub.name],
      );
      if (rows.length === 0) {
        await sub.handle({ client: this.client, event });
        await this.client.query("insert into processed_events (event_id, subscriber) values ($1, $2)", [
          event.id,
          sub.name,
        ]);
      }
      await this.client.query("commit");
    } catch (err) {
      await this.client.query("rollback");
      throw err;
    }
  }

  /**
   * Rejeu depuis la table `events` (ordre d'émission). Idempotent : les événements déjà traités par
   * un abonné sont ignorés, seuls les effets manquants sont appliqués. Optionnellement borné à une
   * chaîne (`correlationId`).
   */
  async replay(opts: { correlationId?: string } = {}): Promise<void> {
    const where = opts.correlationId ? "where correlation_id = $1" : "";
    const params = opts.correlationId ? [opts.correlationId] : [];
    const { rows } = await this.client.query(
      `select id, type, payload, mandate_id, emitted_by, emitted_at, audience, correlation_id
       from events ${where} order by emitted_at asc, id asc`,
      params,
    );
    for (const r of rows) {
      await this.dispatch(rowToEvent(r as unknown as EventRow));
    }
  }
}
