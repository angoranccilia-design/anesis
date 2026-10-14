/** Deliverables derived from a contract: only those its nature calls for. Each one says it is prepared, not sent. */
import type { InterventionContract, Deliverable } from "./contract.js";

const NOT_SENT = "Prepared by Anesis for human review. Not sent, not deployed, not launched. No spend is authorised by this document.";
const money = (c: InterventionContract) => (c.estimatedBudget.amountGbp !== null ? `£${c.estimatedBudget.amountGbp.toLocaleString("en-GB")} (${c.estimatedBudget.status})` : "UNKNOWN");

export function deliverablesFor(c: InterventionContract): Deliverable[] {
  const out: Deliverable[] = [];
  const evidenceLines = [`Verified: ${c.evidence.verified.join(", ") || "none"}`, `Estimated: ${c.evidence.estimated.join(", ") || "none"}`, `Hypotheses: ${c.evidence.hypotheses.join(" | ") || "none"}`, `Unknown: ${c.evidence.unknown.join(" | ") || "none"}`];
  if (c.dataRequest) {
    out.push({ kind: "DATA_REQUEST", title: `Data request before any decision on ${c.decisionPackageRef.interventionId}`, body: [`Missing: ${c.dataRequest.missing.join("; ") || "see unknowns"}`, `Why: ${c.dataRequest.why}`, `Decision it would inform: ${c.dataRequest.decisionItWouldInform}`, `Impossible without it: ${c.dataRequest.impossibleWithout.join("; ")}`], notSentNote: NOT_SENT });
    if (c.decisionStatus === "INVESTIGATE") out.push({ kind: "ADDITIONAL_ANALYSIS", title: `Analysis plan: ${c.objective}`, body: [`Question: ${c.priorityReason}`, ...evidenceLines, `What would change the decision: ${c.invalidatingConditions.join(" | ") || "not computed"}`], notSentNote: NOT_SENT });
    return out;
  }
  if (c.decisionStatus !== "FUNDED") return out;
  const common = [`Constraint: ${c.constraint.name}${c.constraint.isBinding ? " (binding)" : ""}`, `Why now: ${c.priorityReason}`, ...evidenceLines, `Estimated budget: ${money(c)} — approval ${c.approvalLevel >= 2 ? "required" : "not required"}, status ${c.budgetStatus}`, `Owner: ${c.owner.head}`];
  if (c.constraint.kind === "CONVERSION") {
    out.push({ kind: "TECHNICAL_TICKET", title: `Booking journey: ${c.objective}`, body: [...common, `Observations: ${c.sources.map((s) => `${s.metric}=${s.value ?? "?"} ${s.unit ?? ""} [${s.cls}]`).join("; ")}`, "Reproduction: NOT VERIFIED — to be performed on the devices and browsers the analytics show before any fix is specified", `Expected result: ${c.measurement.successRule ?? "not measurable"}`, "Production: no change without the responsible Head's sign-off and a post-release verification run"], notSentNote: NOT_SENT });
    out.push({ kind: "BOOKING_JOURNEY_BRIEF", title: `Brief for the booking-journey work`, body: [...common, `Actions: ${c.actions.join(" → ")}`, `Execution evidence required: ${c.executionEvidenceRequired.join("; ")}`], notSentNote: NOT_SENT });
  } else if (c.constraint.kind === "DEMAND") {
    out.push({ kind: "ACQUISITION_BRIEF", title: `Acquisition brief: ${c.objective}`, body: [...common, "Nothing launches before approval; the holdout in the plan is part of the launch, not optional", `Actions: ${c.actions.join(" → ")}`], notSentNote: NOT_SENT });
    out.push({ kind: "TEST_PLAN", title: "Holdout / geo test", body: [`Hypothesis: ${c.measurement.hypothesis}`, `Primary metric: ${c.measurement.primaryMetric}`, `Window: ${c.measurement.windowWeeks ?? "unknown"} weeks`, `Causal limits: ${c.measurement.causalLimits}`], notSentNote: NOT_SENT });
  } else if (c.constraint.kind === "RETENTION") {
    out.push({ kind: "GUEST_SEQUENCE_PLAN", title: `Guest sequence: ${c.objective}`, body: [...common, "No message is sent by Anesis; consent is checked before any send by the property's CRM operator", `Actions: ${c.actions.join(" → ")}`], notSentNote: NOT_SENT });
  } else {
    out.push({ kind: "DEVELOPER_BRIEF", title: `Brief: ${c.objective}`, body: [...common, `Actions: ${c.actions.join(" → ")}`], notSentNote: NOT_SENT });
  }
  out.push({ kind: "MEASUREMENT_PLAN", title: `Measurement before execution — ${c.decisionPackageRef.interventionId}`, body: [`Problem: ${c.measurement.problem}`, `Hypothesis: ${c.measurement.hypothesis}`, `Primary metric: ${c.measurement.primaryMetric}; secondary: ${c.measurement.secondaryMetrics.join(", ") || "none"}`, `Baseline: ${c.baseline.value ?? "UNKNOWN"} ${c.baseline.unit ?? ""} [${c.baseline.status}] ${c.baseline.note}`, `Missing data: ${c.measurement.missingData.join("; ") || "none"}`, `Window: ${c.measurement.windowWeeks ?? "unknown"} weeks`, `Confounders: ${c.measurement.confounders.join("; ")}`, `Success: ${c.measurement.successRule ?? "cannot be stated"}; failure/stop: ${c.measurement.failureRule ?? "cannot be stated"}`, `Causal limits: ${c.measurement.causalLimits}`, `Pre-registration: ${c.measurement.preregistration ? `${c.measurement.preregistration.planId} v${c.measurement.preregistration.version} ${c.measurement.preregistration.sha256.slice(0, 12)}` : "none"}`], notSentNote: NOT_SENT });
  return out;
}

export function closureDossier(c: InterventionContract): Deliverable {
  const x = c.execution; const money = (m: { amountGbp: number | null; status: string }) => (m.amountGbp === null ? m.status : `£${Math.round(m.amountGbp).toLocaleString("en-GB")} (${m.status})`);
  const after = [`Approved cost: ${money(c.approvedCost)}; actual spend: ${money(x.actualSpend)}`, `Proofs: ${x.proofs.length ? x.proofs.map((p) => `${p.kind} ${p.reference} (${p.by}, ${p.recordedAt.slice(0, 10)})`).join("; ") : "none recorded"}`, `Result: ${x.measured ? `${x.measured.metric} ${x.measured.before === null ? "?" : Math.round(x.measured.before)} → ${x.measured.after === null ? "?" : Math.round(x.measured.after)} ${x.measured.unit} over ${x.measured.postWeeks}/${x.measured.windowWeeks} weeks, change ${x.measured.observedChange === null ? "unknown" : Math.round(x.measured.observedChange)} (${x.measured.seasonalAdjustment.applied ? "seasonally adjusted" : "not seasonally adjusted"}); incrementality ${x.measured.incrementality}` : "not measured"}`];
  return { kind: "CLOSURE_DOSSIER", title: `Closure — ${c.id}`, body: [`State: ${c.state}, version ${c.version}, origin ${c.originSha256.slice(0, 12)}`, ...after, ...c.history.map((h) => `${h.seq}. ${h.at} ${h.from ?? "—"} → ${h.to} by ${h.by}${h.human ? " (human)" : ""}: ${h.note}${h.evidence.length ? " [" + h.evidence.join(", ") + "]" : ""}`)], notSentNote: NOT_SENT };
}
