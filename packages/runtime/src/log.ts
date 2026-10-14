/** Structured logs on stdout, one JSON object per line, with secrets redacted by key name. Never log a request body, a token or a link. */
const SECRET = /key|token|secret|password|authorization|cookie|url$/i;
export function redact(v: unknown, depth = 0): unknown {
  if (depth > 6 || v === null || typeof v !== "object") return v;
  if (Array.isArray(v)) return v.map((x) => redact(x, depth + 1));
  return Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([k, x]) => [k, SECRET.test(k) ? "[redacted]" : redact(x, depth + 1)]));
}
export function log(level: "info" | "warn" | "error", msg: string, fields: Record<string, unknown> = {}): void {
  const line = JSON.stringify({ at: new Date().toISOString(), level, msg, ...(redact(fields) as Record<string, unknown>) });
  if (level === "error") console.error(line); else console.log(line);
}
