import "server-only";
import type { Answer } from "./ask.js";

/**
 * Optional language layer. STATUS: IMPLEMENTED behind an environment variable; OFF in this environment.
 * When ANTHROPIC_API_KEY is set, the model may rephrase or translate the facts of a structured answer into the
 * speaker's language.
 * It receives only those facts and is instructed not to add numbers or claims. Its output is shown
 * alongside the facts, never instead of them. Without a key, `enabled` is false and the UI says so.
 */
export const llmEnabled = (): boolean => Boolean(process.env.ANTHROPIC_API_KEY);

export async function rephrase(question: string, a: Answer, language = "en"): Promise<string | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  const model = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5";
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model, max_tokens: 300,
      system: `You are the language layer of Anesis, a hospitality commercial-intelligence system. Restate ONLY the facts you are given, in two or three plain sentences, in the language whose code is "${language}" (British spelling for English). Never add a number, a cause, a recommendation or a source that is not in the facts. Keep record ids and £ amounts exactly. If the facts say evidence is insufficient, say so.`,
      messages: [{ role: "user", content: `Question: ${question}\nHeadline: ${a.headline}\nFacts:\n${a.facts.map((f) => "- " + f).join("\n")}` }],
    }),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { content?: { type: string; text?: string }[] };
  return json.content?.find((c) => c.type === "text")?.text ?? null;
}
