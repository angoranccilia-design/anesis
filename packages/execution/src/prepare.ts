/**
 * prepareInterventions — from a real CycleResult to intervention contracts. Every field is read from the engine's own
 * records (diagnosis, observations, requirements, decision, plan, budget, package); nothing is computed here that the
 * engine did not already compute, and nothing absent is invented. Deterministic: same cycle → same contracts and hashes.
 */
import { sha256Hex, type CycleResult, type InterventionRecord, type Observation } from "@anesis/engine";
import { frozenView, canonical, type InterventionContract, type EvidenceItem, type EvidenceClass, type MeasurementProtocol } from "./contract.js";
import { deliverablesFor } from "./deliverables.js";

const cls = (o: Observation): EvidenceClass => (o.status === "VERIFIED" ? "VERIFIED" : o.status === "MODELLED" || o.status === "BENCHMARK" ? "ESTIMATED" : o.status === "SIMULATED" ? "HYPOTHESIS" : "ESTIMATED");

function sourcesFor(r: CycleResult, rec: InterventionRecord): EvidenceItem[] {
  const ids = new Set<string>(rec.evidence);
  for (const cid of rec.constraint) { const c = r.diagnosis.constraints.find((x) => x.id === cid); c?.evidence.forEach((e) => ids.add(e)); }
  const obs = r.property.observations.filter((o) => ids.has(o.id));
  return obs.map((o) => ({ id: o.id, metric: o.metric, value: o.value, unit: o.unit, source: o.source, cls: cls(o), note: o.status === "SIMULATED" ? "simulated property data, not an observation of a real property" : o.transformation }));
}

function protocolFor(r: CycleResult, rec: InterventionRecord, sources: EvidenceItem[], unknown: string[]): MeasurementProtocol {
  const plan = r.plan && r.plan.interventionIds.includes(rec.id) ? r.plan : null;
  const c = r.diagnosis.constraints.find((x) => x.id === rec.constraint[0]);
  const baseObs = c ? sources.find((s) => s.metric === c.metric) : undefined;
  const baseline: MeasurementProtocol["baseline"] = baseObs ? { value: baseObs.value, unit: baseObs.unit, status: baseObs.cls, note: `${baseObs.id} ${baseObs.source}` } : { value: null, unit: null, status: "UNKNOWN", note: "no observation of the target metric in this cycle" };
  const measurable = rec.decisionStatus === "FUNDED";
  return {
    problem: rec.problem, hypothesis: plan?.hypotheses.find((h) => h.includes(rec.id)) ?? `${rec.name} raises ${c?.metric ?? "the target metric"} towards its benchmark`,
    primaryMetric: plan?.primaryMetric ?? (c?.metric ?? "unknown"), secondaryMetrics: plan?.secondaryMetrics ?? [],
    baseline, missingData: unknown, windowWeeks: plan?.windowWeeks ?? null,
    confounders: ["seasonality (profiled, not removed)", "other interventions running in the same window", "external signals tested for relevance at decision time only", "competitor moves after the decision"],
    successRule: measurable ? rec.successThreshold : null, failureRule: measurable && plan ? plan.stoppingRule : null,
    causalLimits: plan ? `${plan.counterfactualMethod}; a result is incremental only if the pre-registered comparison holds and the placebo test passes; otherwise the change is observed, not attributed` : "no pre-registered plan: any change after execution is observed, not attributed",
    preregistration: plan ? { planId: plan.id, version: plan.version, sha256: plan.sha256 } : null,
  };
}

export function prepareInterventions(r: CycleResult, runId: string, preparedAt: string, propertyId = r.property.spec.id): InterventionContract[] {
  return r.records.map((rec) => {
    const sources = sourcesFor(r, rec);
    const req = r.requirements.find((q) => q.interventionId === rec.id);
    const verified = sources.filter((s) => s.cls === "VERIFIED").map((s) => `${s.metric} (${s.id})`);
    const estimated = sources.filter((s) => s.cls === "ESTIMATED").map((s) => `${s.metric} (${s.id})`);
    const hypotheses = [...sources.filter((s) => s.cls === "HYPOTHESIS").map((s) => `${s.metric} (${s.id}, simulated)`), rec.confidenceBasis];
    const unknown = req ? req.checks.filter((k) => !k.satisfied).map((k) => `${k.item}${k.critical ? " (critical)" : ""}: ${k.how}`) : ["data requirements not evaluated for this intervention"];
    const binding = rec.constraint.includes(r.diagnosis.binding ?? "");
    const c = r.diagnosis.constraints.find((x) => x.id === rec.constraint[0]);
    const line = r.allocation.lines.find((l) => l.interventionId === rec.id);
    const priorityReason = rec.decisionStatus === "FUNDED" ? `${binding ? "acts on the binding constraint" : "acts on a constraint downstream of the binding one"}; expected value £${Math.round(rec.expectedValueGbp).toLocaleString("en-GB")} on a £${Math.round(rec.capitalGbp).toLocaleString("en-GB")} estimate; ${line?.blockedBy.length ? line.blockedBy.join("; ") : "no dependency blocks it"}` : rec.decisionStatus === "INVESTIGATE" ? `information purchase first: ${rec.whatWouldUnblock ?? "evidence insufficient"}` : `${rec.decisionStatus}: ${rec.blockedBy.join("; ") || "not selected in this cycle"}`;
    const options = r.records.filter((o) => o.id !== rec.id).map((o) => ({ id: o.id, name: o.name, status: o.decisionStatus, reasons: r.decision.rejected.find((x) => x.id === o.id)?.reasons ?? o.blockedBy }));
    const invalidating = r.decision.wouldChangeIf.filter((w) => w.interventionId === rec.id || w.interventionId === null).map((w) => `${w.metric} ${w.operator} ${w.threshold}: ${w.why}`);
    const protocol = protocolFor(r, rec, sources, unknown);
    const dataRequest = rec.decisionStatus === "INVESTIGATE" || req?.verdict === "INSUFFICIENT_EVIDENCE" || (req && req.verdict !== "SUFFICIENT" && rec.decisionStatus !== "FUNDED") ? { missing: unknown, why: `the engine marked ${rec.id} ${rec.decisionStatus}${req ? ` (${req.verdict})` : ""}: ${rec.whatWouldUnblock ?? req?.note ?? "evidence insufficient"}`, decisionItWouldInform: `whether to fund ${rec.name}`, impossibleWithout: [`an expected value for ${rec.id} that can be defended`, "a success threshold that can be measured"] } : null;
    const base: Omit<InterventionContract, "originSha256" | "deliverables"> = {
      id: `INT-${runId}-${rec.id}`, propertyId,
      decisionPackageRef: { runId, decisionId: r.decision.id, interventionId: rec.id, preparedAt },
      constraint: { id: c?.id ?? null, name: c?.name ?? rec.package.commercialConstraint, kind: c?.kind ?? rec.constraintKind, isBinding: binding },
      diagnosis: r.diagnosis.bindingWhy, sources,
      evidence: { verified, estimated, hypotheses, unknown },
      priorityReason, optionsConsidered: options, invalidatingConditions: invalidating,
      objective: rec.objective, baseline: protocol.baseline,
      resultIndicator: { metric: protocol.primaryMetric, method: protocol.causalLimits },
      observationWindowWeeks: protocol.windowWeeks,
      risks: { operational: rec.risk === "High" ? "operational load on the property during execution" : "low operational load", financial: `estimate ${rec.budget.estimated.status} ${rec.budget.estimated.amountGbp !== null ? "£" + rec.budget.estimated.amountGbp.toLocaleString("en-GB") : "unknown"}; no spend without approval`, reputational: rec.reversibility === "Low" ? "hard to reverse if guests notice a regression" : "reversible; guest-facing changes can be rolled back", level: rec.risk, reversibility: rec.reversibility },
      prerequisites: { dependsOn: rec.dependency, status: rec.dependencyStatus, unmet: rec.dependencyStatus === "UNRESOLVED" ? rec.blockedBy : [] },
      estimatedBudget: rec.budget.estimated, approvedCost: rec.budget.approved,
      owner: { head: rec.owner, capabilities: rec.package.requiredCapabilities, executionResources: rec.package.executionResources },
      actions: actionsFor(rec), executionEvidenceRequired: evidenceFor(rec),
      measurement: protocol,
      confidence: { value: rec.confidence, basis: rec.confidenceBasis, limits: ["declared prior, calibrated only after measured cycles", ...(sources.some((s) => s.cls === "HYPOTHESIS") ? ["cited data are simulated"] : []), ...(unknown.length ? [`${unknown.length} data requirement(s) unmet`] : [])] },
      history: [{ seq: 1, at: preparedAt, by: "engine", human: false, from: null, to: "PREPARED", note: `prepared from ${runId} ${r.decision.id}; status ${rec.decisionStatus}; approval L${rec.approvalLevel}`, evidence: [] }],
      decisionStatus: rec.decisionStatus, budgetStatus: rec.budget.status, approvalLevel: rec.approvalLevel, state: "PREPARED", version: 1,
      dataRequest, simulated: sources.some((s) => s.cls === "HYPOTHESIS"),
    };
    const originSha256 = sha256Hex(canonical(frozenView(base)));
    const contract: InterventionContract = { ...base, originSha256, deliverables: [] };
    return { ...contract, deliverables: deliverablesFor(contract) };
  });
}

function actionsFor(rec: InterventionRecord): string[] {
  const f = rec.constraintKind;
  if (rec.decisionStatus === "INVESTIGATE") return ["obtain the missing data listed under evidence.unknown", "re-run the decision cycle with the data", "do not start execution"];
  if (rec.decisionStatus !== "FUNDED") return ["no action: the engine did not select this intervention"];
  if (f === "CONVERSION") return ["reproduce the booking-journey defect on the devices and browsers the analytics show (not yet done)", "specify the fix with the developer; no change reaches production without the responsible Head's sign-off and a verification run", "confirm measurement events fire before and after", "release behind a rollback plan"];
  if (f === "DEMAND") return ["prepare the campaign structure and budget split; nothing launches before approval", "set up the holdout or geo test written in the plan", "confirm conversion events and attribution settings"];
  if (f === "RETENTION") return ["segment the consented base", "write the sequence; nothing is sent before approval and consent check", "set the control group written in the plan"];
  if (f === "ECONOMIC") return ["draft the direct-rate proposition and parity rules", "agree the display changes with the booking-engine provider", "nothing is published before approval"];
  return ["define the work with the responsible Head", "prepare the measurement before starting"];
}
function evidenceFor(rec: InterventionRecord): string[] {
  if (rec.decisionStatus !== "FUNDED") return [];
  const f = rec.constraintKind;
  if (f === "CONVERSION") return ["deployment record (who, when, what changed)", "post-release verification run on the declared devices", "measurement events observed after release"];
  if (f === "DEMAND") return ["campaign set-up export with holdout configuration", "spend report from the platform", "attribution settings screenshot"];
  if (f === "RETENTION") return ["sequence configuration export", "send log with counts and control group", "consent check record"];
  return ["written confirmation from the responsible Head", "artefact of the change"];
}
