// STUB (M00). Owned by M05: replace every body. All functions take optional deps last (AGENTS.md §6.8).
import type { LLM } from "../llm/index.ts";
import type { Memory } from "../memory/index.ts";
import type { Answer, Brief, Commitment, Landmine } from "../models.ts";

export type AgentDeps = { memory?: Memory; llm?: LLM };

const notImplemented = (): never => {
  throw new Error("not implemented: agent");
};

export async function commitmentLedger(_account: string, _deps?: AgentDeps): Promise<Commitment[]> {
  return notImplemented();
}

export async function landmines(_account: string, _deps?: AgentDeps): Promise<Landmine[]> {
  return notImplemented();
}

export async function brief(_account: string, _deps?: AgentDeps): Promise<Brief> {
  return notImplemented();
}

export async function ask(_account: string, _question: string, _deps?: AgentDeps): Promise<Answer> {
  return notImplemented();
}

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
