/** A benchmark task: fixed inputs, a deterministic scorer, and a statement of how its result can be verified. */
export interface Task {
  readonly id: string;
  readonly name: string;
  readonly family: "diagnosis" | "evidence_discipline" | "language" | "governance" | "extraction" | "brief";
  readonly prompt: string;                       // what a model receives (facts only; nothing it should invent)
  readonly expected: unknown;                    // ground truth, computed by the deterministic engine or fixed
  readonly score: (output: string) => Score;     // 1 = correct and respects the data; 0 = wrong or invented
  readonly verifiable: "exact" | "rule" | "human";   // how a reviewer can check the result without trusting the model
  readonly deterministicAlternative: string | null;  // what code does this task today, if anything
}
export interface Score { readonly value: number; readonly note: string; readonly inventedData?: boolean }
export interface ProviderResult { readonly output: string; readonly inputTokens: number | null; readonly outputTokens: number | null; readonly latencyMs: number; readonly error: string | null }
export interface Provider { readonly id: string; readonly model: string; run(task: Task): Promise<ProviderResult> }
export interface TaskRow { readonly taskId: string; readonly provider: string; readonly model: string; readonly score: number; readonly note: string; readonly inventedData: boolean; readonly latencyMs: number; readonly inputTokens: number | null; readonly outputTokens: number | null; readonly costGbp: number | null; readonly error: string | null; readonly output: string }
