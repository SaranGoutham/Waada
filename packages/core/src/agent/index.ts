// Agent surface (M05, AGENTS.md §6.8). All functions take optional deps last.
import type { LLM } from "../llm/index.ts";
import type { Memory } from "../memory/index.ts";

export type AgentDeps = { memory?: Memory; llm?: LLM };

export { ask } from "./ask.ts";
export { baselineCrm, baselineSummary, compare } from "./baselines.ts";
export { brief } from "./brief.ts";
export { landmines } from "./landmines.ts";
export { commitmentLedger } from "./ledger.ts";

const notImplemented = (): never => {
  throw new Error("not implemented: agent");
};

/** Markdown, including reflect() "learned patterns". Should-have tier (§1a): not in this card. */
export async function report(_account: string, _deps?: AgentDeps): Promise<string> {
  return notImplemented();
}
