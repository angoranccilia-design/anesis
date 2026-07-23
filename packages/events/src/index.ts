/** @anesis/events — bus au-dessus de la table events append-only : abonnements typés, corrélation, rejeu idempotent. */
export { EventBus, type Subscriber, type EventHandlerContext } from "./bus.js";
export { makeEvent, type MakeEventInput } from "./event-factory.js";
