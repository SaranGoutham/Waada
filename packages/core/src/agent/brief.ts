// brief (M05): ledger, then landmines, then the markdown chat, one LLM request
// after another. The free Groq tier allows 8,000 tokens per minute, so parallel
// extracts (2 × ~4k tokens in the same window) 429; sequential requests plus
// the llm/retry.ts 429 wait fit the tier. Memory recalls stay parallel: they
// hit Hindsight, not the LLM token budget.

import { truncateForBudget } from "../llm/budget.ts";
import { createLLM } from "../llm/index.ts";
import { createMemory } from "../memory/index.ts";
import type { Brief as BriefT, MemoryHit } from "../models.ts";
import { Brief } from "../models.ts";
import type { AgentDeps } from "./index.ts";
import { landmines } from "./landmines.ts";
import { commitmentLedger } from "./ledger.ts";
import { BRIEF_SYSTEM, briefUser } from "./prompts.ts";

/**
 * Recall context per brief-chat section (4,000 chars ≈ 1,000 tokens each).
 * Together with the structured commitment/landmine lists and the system prompt
 * the chat stays inside MAX_PROMPT_CHARS. Hits arrive relevance-ranked, so
 * tail truncation drops the least-relevant ones.
 */
export const BRIEF_RECALL_BUDGET_CHARS = 4_000;

function formatHits(hits: MemoryHit[]): string {
  return hits
    .map((h) => `- [${h.date ?? "undated"}] (${h.context ?? "no context"}): ${h.text}`)
    .join("\n");
}

function newestFirst(hits: MemoryHit[]): MemoryHit[] {
  return [...hits].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
}

function truncateNewestFirst(text: string, budget: number): string {
  if (text.length <= budget) return text;
  return `… [showing the newest ${budget} of ${text.length} characters; older text omitted]\n${text.slice(0, budget)}`;
}

export async function brief(account: string, deps?: AgentDeps): Promise<BriefT> {
  const memory = deps?.memory ?? createMemory();
  const llm = deps?.llm ?? (await createLLM());
  // Sequential LLM requests: ledger extract, then landmines extract. Each
  // request alone fits the per-request budget; running them back-to-back keeps
  // the rolling per-minute window drainable via 429 retry-after waits.
  const commitments = await commitmentLedger(account, { memory, llm });
  const mines = await landmines(account, { memory, llm });
  const [stakeholders, recent] = await Promise.all([
    memory.search(account, "stakeholders, their roles, what each cares about, sentiment", {
      budget: "high",
    }),
    memory.search(account, "what changed recently, timeline changes", { budget: "high" }),
  ]);
  const markdown = await llm.chat({
    system: BRIEF_SYSTEM,
    user: briefUser({
      commitments: commitments.filter((commitment) => commitment.status === "open"),
      landmines: mines,
      stakeholders: truncateForBudget(formatHits(stakeholders), BRIEF_RECALL_BUDGET_CHARS),
      recent: truncateNewestFirst(formatHits(newestFirst(recent)), BRIEF_RECALL_BUDGET_CHARS),
    }),
  });
  return Brief.parse({ account, markdown, commitments, landmines: mines });
}
