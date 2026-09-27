// Baselines + compare (M05, card 002): the honest competitor stand-ins.
// Both baselines answer the brief prompt WITHOUT Hindsight: baselineCrm sees only
// CRM fields, baselineSummary sees all raw text. Neither may touch memory.
import type { Dirent } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { findProjectRoot } from "../config.ts";
import { WaadaError } from "../errors.ts";
import { parseFiles } from "../ingest/parse-files.ts";
import { truncateForBudget } from "../llm/budget.ts";
import { createLLM, type LLM } from "../llm/index.ts";
import { createLogger } from "../log.ts";
import type { FileInput, Interaction } from "../models.ts";
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

function seedDir(account: string): string {
  return join(findProjectRoot(), "seed", account);
}

/** Reads seed/<account>/crm.json as "key: value" lines. HubSpot is post-MVP (card 002). */
async function readCrmFields(account: string): Promise<string> {
  const file = join(seedDir(account), "crm.json");
  let raw: string;
  try {
    raw = await readFile(file, "utf8");
  } catch (err) {
    throw new WaadaError(`No CRM record found for "${account}" at seed/${account}/crm.json.`, {
      cause: err,
    });
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new WaadaError(`seed/${account}/crm.json is not valid JSON.`, { cause: err });
  }
  const fields = CRM_FIELDS.safeParse(parsed);
  if (!fields.success) {
    throw new WaadaError(`seed/${account}/crm.json does not look like a CRM record.`);
  }
  return Object.entries(fields.data)
    .map(([key, value]) => `${key}: ${typeof value === "string" ? value : JSON.stringify(value)}`)
    .join("\n");
}

const SLACK_DAY = /^20\d\d-\d\d-\d\d\.json$/;
const DOC_NAMES = new Set(["EXPECTED.md", "README.md"]);

/** Supported source files for the summary baseline: .eml/.txt/.vtt anywhere, .md transcripts,
 * and Slack channel-day JSON (seed/<account>/slack/<channel>/20*.json). Doc files are skipped. */
function supportedFile(relative: string): boolean {
  const lower = relative.toLowerCase();
  if (DOC_NAMES.has(lower.split("/").pop() ?? "")) return false;
  if (lower.endsWith(".eml") || lower.endsWith(".txt") || lower.endsWith(".vtt")) return true;
  if (lower.endsWith(".md")) return lower.includes("transcripts");
  if (lower.endsWith(".json")) {
    return lower.includes("slack") && SLACK_DAY.test(lower.split("/").pop() ?? "");
  }
  return false;
}

/** Every supported source file under seed/<account>, mirroring the M04 layout
 * (emails/, transcripts/, slack/<channel>/). */
async function readSeedFiles(dir: string, relative = ""): Promise<FileInput[]> {
  const out: FileInput[] = [];
  let entries: Dirent[];
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (err) {
    throw new WaadaError(`Could not read the seed folder at ${dir}.`, { cause: err });
  }
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const rel = `${relative}${entry.name}`;
    if (entry.isDirectory()) {
      out.push(...(await readSeedFiles(join(dir, entry.name), `${rel}/`)));
    } else if (entry.isFile() && supportedFile(rel)) {
      out.push({ name: rel, data: new Uint8Array(await readFile(join(dir, entry.name))) });
    }
  }
  return out;
}

/** Parses seed/<account> through M03 (parseFiles) and renders the interactions oldest-first. */
async function rawTranscript(account: string, llm: LLM): Promise<string> {
  const files = await readSeedFiles(seedDir(account));
  const { interactions, errors } = await parseFiles(files, account, { llm });
  if (interactions.length === 0) {
    throw new WaadaError(
      `No interactions could be parsed from seed/${account}/. ${errors.join("; ")}`,
    );
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
  const transcript = await rawTranscript(account, llm);
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
