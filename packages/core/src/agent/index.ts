// STUB (M00). Owned by M05: replace every body. All functions take optional deps last (AGENTS.md §6.8).
import type { LLM } from "../llm/index.ts";
import type { Memory } from "../memory/index.ts";

export type AgentDeps = { memory?: Memory; llm?: LLM };

export { ask } from "./ask.ts";
export { brief } from "./brief.ts";
export { landmines } from "./landmines.ts";
export { commitmentLedger } from "./ledger.ts";

const notImplemented = (): never => {
  throw new Error("not implemented: agent");
};

/** Markdown, including reflect() "learned patterns". */
export async function report(_account: string, _deps?: AgentDeps): Promise<string> {
  return notImplemented();
}

/** CRM fields only (seed/<account>/crm.json unless HubSpot is configured). */
export async function baselineCrm(_account: string, _deps?: AgentDeps): Promise<string> {
  return notImplemented();
}

/** All raw text, no Hindsight. */
export async function baselineSummary(_account: string, _deps?: AgentDeps): Promise<string> {
  return notImplemented();
}

export async function compare(
  _account: string,
  _deps?: AgentDeps,
): Promise<{ crm: string; summary: string; waada: string }> {
  return notImplemented();
}
