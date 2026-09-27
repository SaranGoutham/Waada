// brief (M05): ledger + landmines in parallel, plus stakeholder and
// recent-change recalls; llm.chat renders the markdown in contract order.
import { createLLM } from "../llm/index.ts";
import { createMemory } from "../memory/index.ts";
import type { Brief as BriefT, MemoryHit } from "../models.ts";
import { Brief } from "../models.ts";
import type { AgentDeps } from "./index.ts";
import { landmines } from "./landmines.ts";
import { commitmentLedger } from "./ledger.ts";
import { BRIEF_SYSTEM, briefUser } from "./prompts.ts";

function formatHits(hits: MemoryHit[]): string {
  return hits
    .map((h) => `- [${h.date ?? "undated"}] (${h.context ?? "no context"}): ${h.text}`)
    .join("\n");
}

export async function brief(account: string, deps?: AgentDeps): Promise<BriefT> {
  const memory = deps?.memory ?? createMemory();
  const llm = deps?.llm ?? (await createLLM());
  const [commitments, mines, stakeholders, recent] = await Promise.all([
    commitmentLedger(account, { memory, llm }),
    landmines(account, { memory, llm }),
    memory.search(account, "stakeholders, their roles, what each cares about, sentiment", {
      budget: "high",
    }),
    memory.search(account, "what changed recently, timeline changes", { budget: "high" }),
  ]);
  const markdown = await llm.chat({
    system: BRIEF_SYSTEM,
    user: briefUser({
      commitments,
      landmines: mines,
      stakeholders: formatHits(stakeholders),
      recent: formatHits(recent),
    }),
  });
  return Brief.parse({ account, markdown, commitments, landmines: mines });
}
