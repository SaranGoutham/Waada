// ask (M05): one high-budget recall, answer only from memories with citations.
import { MAX_PROMPT_CHARS } from "../llm/budget.ts";
import { createLLM } from "../llm/index.ts";
import { createMemory } from "../memory/index.ts";
import type { Answer as AnswerT } from "../models.ts";
import { Answer } from "../models.ts";
import type { AgentDeps } from "./index.ts";
import { ASK_SYSTEM, askUser } from "./prompts.ts";

export async function ask(account: string, question: string, deps?: AgentDeps): Promise<AnswerT> {
  const memory = deps?.memory ?? createMemory();
  const llm = deps?.llm ?? (await createLLM());
  const hits = await memory.search(account, question, { budget: "high" });
  if (hits.length === 0) {
    return Answer.parse({
      text: `That is not in memory for ${account}.`,
      citations: [],
    });
  }
  const userWithoutEvidence = askUser(question, []);
  const evidenceBudget = Math.max(
    0,
    MAX_PROMPT_CHARS - ASK_SYSTEM.length - userWithoutEvidence.length,
  );
  let used = 0;
  const excerpts: string[] = [];
  for (const hit of hits) {
    const excerpt = `[${hit.date ?? "undated"}] (${hit.context ?? "no context"}): ${hit.text}`;
    const prefixLength = excerpts.length === 0 ? 2 : 3;
    const remaining = evidenceBudget - used - prefixLength;
    if (remaining <= 0) break;
    excerpts.push(excerpt.slice(0, remaining));
    used += prefixLength + Math.min(excerpt.length, remaining);
    if (excerpt.length > remaining) break;
  }
  const text = await llm.chat({
    system: ASK_SYSTEM,
    user: askUser(question, excerpts),
  });
  const citations = hits.map((h, i) => h.context ?? h.documentId ?? `excerpt ${i + 1}`);
  return Answer.parse({ text, citations });
}
