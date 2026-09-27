// Baselines + compare (M05, card 002): the honest competitor stand-ins.
// Both baselines answer the brief prompt WITHOUT Hindsight: baselineCrm sees only
// CRM fields, baselineSummary sees all raw text. Neither may touch memory.
import { z } from "zod";
import { WaadaError } from "../errors.ts";
import { truncateForBudget } from "../llm/budget.ts";
import { createLLM } from "../llm/index.ts";
import { createLogger } from "../log.ts";
import { Interaction } from "../models.ts";
import { readJson } from "../store.ts";
import { brief } from "./brief.ts";
import type { AgentDeps } from "./index.ts";
import { BRIEF_SYSTEM, baselineCrmUser, baselineSummaryUser } from "./prompts.ts";

const log = createLogger("agent");

/** Character budget for the summary baseline: raw text older than this is dropped.
 * Sized for the free Groq tier (card 007): 12,000 chars ≈ 3,000 input tokens,
 * plus the brief system prompt and one brief of markdown output the request
 * stays near ~5,000 tokens — under the 8,000 TPM cap. Acme's full text is
 * ~30,000 chars, so the baseline genuinely sees less than everything; the
 * comparison stays fair because Waada's own extracts are capped the same way
 * (see EVIDENCE_BUDGET_CHARS and BRIEF_RECALL_BUDGET_CHARS). */
export const SUMMARY_BUDGET_CHARS = 12_000;

const CRM_FIELDS = z.record(z.string(), z.unknown());

export { truncateForBudget };

/** Reads the CRM record uploaded for this account as "key: value" lines. */
async function readCrmFields(account: string): Promise<string> {
  const fields = await readJson(`crm/${account}.json`, CRM_FIELDS, {});
  if (Object.keys(fields).length === 0) {
    throw new WaadaError(
      "No CRM record imported for this account. Add crm.json on the Import page.",
    );
  }
  return Object.entries(fields)
    .map(([key, value]) => `${key}: ${typeof value === "string" ? value : JSON.stringify(value)}`)
    .join("\n");
}

/** Renders the imported interactions oldest-first without touching Hindsight. */
async function rawTranscript(account: string): Promise<string> {
  const interactions = await readJson(`interactions/${account}.json`, Interaction.array(), []);
  if (interactions.length === 0) {
    throw new WaadaError("Nothing imported for this account yet.");
  }
  const ordered: Interaction[] = [...interactions].sort((a, b) => a.date.localeCompare(b.date));
  const text = ordered
    .map((i) => `[${i.date}] (${i.type} — ${i.title}): ${i.content}`)
    .join("\n\n");
  const truncated = truncateForBudget(text, SUMMARY_BUDGET_CHARS);
  if (truncated !== text) {
    log.info("baselineSummary: raw text truncated to the character budget", {
      account,
      kept: SUMMARY_BUDGET_CHARS,
      total: text.length,
    });
  }
  return truncated;
}

/** CRM fields only — the CRM-only baseline. Never calls memory. */
export async function baselineCrm(account: string, deps?: AgentDeps): Promise<string> {
  const llm = deps?.llm ?? (await createLLM());
  const fields = await readCrmFields(account);
  return llm.chat({ system: BRIEF_SYSTEM, user: baselineCrmUser(fields) });
}

/** All raw interaction text, no Hindsight — the summary-only baseline. Never calls memory. */
export async function baselineSummary(account: string, deps?: AgentDeps): Promise<string> {
  const llm = deps?.llm ?? (await createLLM());
  const transcript = await rawTranscript(account);
  return llm.chat({ system: BRIEF_SYSTEM, user: baselineSummaryUser(transcript) });
}

/** All three briefs one after another (free-tier TPM: parallel legs 429); a
 * failing leg shows its error message in that column instead of failing the
 * whole compare. */
export async function compare(
  account: string,
  deps?: AgentDeps,
): Promise<{ crm: string; summary: string; waada: string }> {
  const run = (leg: () => Promise<string>): Promise<string> =>
    leg().catch((err) => (err instanceof Error ? err.message : String(err)));
  const crm = await run(() => baselineCrm(account, deps));
  const summary = await run(() => baselineSummary(account, deps));
  const waada = await run(async () => (await brief(account, deps)).markdown);
  return { crm, summary, waada };
}
