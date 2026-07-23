/**
 * Analyst (T0) — sur `daily.tick` : relève les métriques du mandat, émet `measurement.recorded`,
 * et si l'écart au plan dépasse le seuil, émet `measurement.deviation_detected`.
 * Version minimale (scénario du test d'acceptation) ; l'intelligence métier viendra à l'étape 4.
 */
import { asId } from "@anesis/core/unsafe";
import type { MeasurementId } from "@anesis/core";
import type { Agent } from "../types.js";
import { uid } from "../helpers.js";

const DEVIATION_THRESHOLD_PCT = 10;

export const analyst: Agent = {
  id: "analyst",
  ticks: ["daily.tick"],
  run: async (ctx) => {
    await ctx.startRun();

    const { rows } = await ctx.client.query("select id from objectives where mandate_id = $1 limit 1", [ctx.mandateId]);
    const objectiveId = (rows[0]?.id as string | undefined) ?? null;

    // Scénario §8 : réservations directes 18 % sous le plan.
    const planned = 100;
    const actual = 82;
    const deviationPct = Math.round(((actual - planned) / planned) * 100); // -18

    const measurementId = uid("meas");
    await ctx.client.query(
      `insert into measurements (id, mandate_id, objective_id, metric, period, planned, actual, deviation_pct)
       values ($1, $2, $3, 'direct_bookings', '2026-08', $4, $5, $6)`,
      [measurementId, ctx.mandateId, objectiveId, planned, actual, deviationPct],
    );

    await ctx.emit("measurement.recorded", { measurementId: asId<MeasurementId>(measurementId), metric: "direct_bookings", actual });

    if (Math.abs(deviationPct) >= DEVIATION_THRESHOLD_PCT) {
      await ctx.emit("measurement.deviation_detected", {
        measurementId: asId<MeasurementId>(measurementId),
        metric: "direct_bookings",
        deviationPct,
      });
    }

    await ctx.completeRun(0, "measured"); // autonome : aucune minute humaine
  },
};
