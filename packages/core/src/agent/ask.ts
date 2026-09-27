// ask (M05): one high-budget recall, answer only from memories with citations.
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
  const text = await llm.chat({
    system: ASK_SYSTEM,
    user: askUser(
      question,
      hits.map((h) => `[${h.date ?? "undated"}] (${h.context ?? "no context"}): ${h.text}`),
    ),
  });
  const citations = hits.map((h, i) => h.context ?? h.documentId ?? `excerpt ${i + 1}`);
  return Answer.parse({ text, citations });
}
