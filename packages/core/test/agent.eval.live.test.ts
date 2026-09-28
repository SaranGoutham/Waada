// M05 evaluation (live): seed/acme → parseFiles → ingest → brief → ask → compare,
// against real Hindsight + the configured LLM. Runs only with `pnpm test:live`.
//
// Scores every check in tasks/M05-agent-core.md "Evaluation" (from seed/acme/EXPECTED.md)
// for Waada AND for both baselines. Waada checks are asserted; baseline scores are
// recorded via console.info and written up in docs/decisions/llm/evals.md (honestly,
// even if the summary baseline scores as well as Waada).
//
// Isolation: the agent sees account "acme" (so baselines read seed/acme/crm.json),
// but a memory wrapper stores everything in bank "waada-acme-eval", leaving a
// UI-imported "acme" bank (and the e2e "-e2e" bank) untouched.
import { readFileSync } from "node:fs";
import { copyFile, mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ask, brief, compare } from "../src/agent/index.ts";
import { findProjectRoot, getEnv } from "../src/config.ts";
import { parseFiles } from "../src/ingest/parse-files.ts";
import { ingest } from "../src/ingest/pipeline.ts";
import { createLLM, type LLM } from "../src/llm/index.ts";
import { saveLlmSettings } from "../src/llm/settings.ts";
import { createMemory, type Memory } from "../src/memory/index.ts";
import type { Brief, Commitment, FileInput, Interaction, Landmine } from "../src/models.ts";
import { writeJson } from "../src/store.ts";

const ACCOUNT = "acme";
const BANK_SUFFIX = "-eval";
const SEED = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "seed", ACCOUNT);
const MINUTE = 60_000;

const root = findProjectRoot();
const realDataDir = getEnv().dataDir; // read before WAADA_DATA_DIR is pointed at the temp dir
const groqApiKey = process.env.GROQ_API_KEY?.trim() || dotEnv().GROQ_API_KEY?.trim() || "";
const savedLlmSettings = join(realDataDir, "llm.json");
const hasHindsight = Boolean(getEnv().hindsightBaseUrl);
const hasLlm = Boolean(groqApiKey) || (await exists(savedLlmSettings));
const live = hasHindsight && hasLlm ? describe : describe.skip;
if (!hasHindsight) console.info("eval skipped: HINDSIGHT_BASE_URL is not set (.env)");
if (!hasLlm) console.info("eval skipped: no GROQ_API_KEY and no saved .waada/llm.json");

function dotEnv(): Record<string, string | undefined> {
  try {
    return parseEnv(readFileSync(join(root, ".env"), "utf8"));
  } catch {
    return {};
  }
}

async function exists(path: string): Promise<boolean> {
  return readFile(path).then(
    () => true,
    () => false,
  );
}

/** Same Memory, but every account maps to "<account>-eval" so the real bank is never touched. */
function isolatedMemory(inner: Memory): Memory {
  const bank = (account: string) => `${account}${BANK_SUFFIX}`;
  return {
    ensureBank: (account) => inner.ensureBank(bank(account)),
    remember: (i: Interaction) => inner.remember({ ...i, account: bank(i.account) }),
    search: (account, query, opts) => inner.search(bank(account), query, opts),
    reflect: (account, query) => inner.reflect(bank(account), query),
    deleteBank: (account) => inner.deleteBank(bank(account)),
  };
}

/** The 33 Acme source files (Slack keeps its channel folder). */
async function seedFiles(): Promise<FileInput[]> {
  const files: FileInput[] = [];
  const add = async (dir: string, pattern: RegExp, prefix = "") => {
    for (const name of (await readdir(join(SEED, dir))).sort()) {
      if (pattern.test(name)) {
        files.push({
          name: `${prefix}${name}`,
          data: new Uint8Array(await readFile(join(SEED, dir, name))),
        });
      }
    }
  };
  await add("emails", /\.eml$/);
  await add(join("slack", "deal-acme"), /^20\d\d-\d\d-\d\d\.json$/, "deal-acme/");
  await add("transcripts", /\.txt$/);
  return files;
}

// --- Scoring helpers (shared for Waada and the baselines) ---

const soc2 = (t: string) => /SOC\s?2/i.test(t);
const deliveredProposal = (t: string) =>
  /pricing proposal|annual.{0,40}proposal|proposal.{0,40}deliver|\$86,?000/i.test(t);
const pricingLandmine = (t: string) => /monthly|annual/i.test(t);
const dontReopen = (t: string) => /do\s?not re-?open|don't re-?open|never quote monthly/i.test(t);
const q3q4Move = (t: string) => /Q4/i.test(t);

function scoreWaada(result: Brief, answerText: string) {
  const first: Commitment | undefined = result.commitments[0];
  const delivered = result.commitments.find((c) => c.status === "delivered");
  const pricing: Landmine | undefined = result.landmines.find((l) =>
    /monthly|annual|pricing/i.test(`${l.topic} ${l.whatHappened} ${l.resolution}`),
  );
  return {
    soc2OpenFirst: Boolean(first && first.status === "open" && soc2(first.text)),
    deliveredPresent: Boolean(
      delivered && deliveredProposal(`${delivered.text} ${delivered.evidence}`),
    ),
    pricingLandmine: Boolean(pricing && dontReopen(`${pricing.guidance} ${pricing.topic}`)),
    q3q4: q3q4Move(answerText),
  };
}

/** Baselines return plain markdown, so score the text for the same four checks. */
function scoreBaselineMarkdown(markdown: string) {
  return {
    soc2OpenFirst: soc2(markdown),
    deliveredPresent: deliveredProposal(markdown),
    pricingLandmine: pricingLandmine(markdown) && dontReopen(markdown),
    q3q4: q3q4Move(markdown),
  };
}

async function writeEvalResult(a: {
  waada: ReturnType<typeof scoreWaada>;
  summary: ReturnType<typeof scoreBaselineMarkdown>;
  crm: ReturnType<typeof scoreBaselineMarkdown>;
  commitments: Commitment[];
}): Promise<void> {
  const currentDataDir = process.env.WAADA_DATA_DIR;
  process.env.WAADA_DATA_DIR = realDataDir;
  try {
    await writeJson("eval/last-run.json", {
      account: ACCOUNT,
      ranAt: new Date().toISOString(),
      checks: { waada: a.waada, summaryOnly: a.summary, crmOnly: a.crm },
      ledger: a.commitments.map((commitment) => ({
        status: commitment.status,
        date: commitment.date,
        text: commitment.text,
        evidence: commitment.evidence.slice(0, 200),
      })),
    });
  } finally {
    if (currentDataDir === undefined) delete process.env.WAADA_DATA_DIR;
    else process.env.WAADA_DATA_DIR = currentDataDir;
  }
}

live("eval: M05 checks on seed/acme (Waada vs baselines)", () => {
  const memory = isolatedMemory(createMemory());
  let llm: LLM;
  const deps = () => ({ memory, llm });
  let dataDir: string;
  let result: Brief | undefined;
  let answerText = "";
  let columns: { crm: string; summary: string; waada: string } | undefined;

  beforeAll(async () => {
    dataDir = await mkdtemp(join(tmpdir(), "waada-eval-"));
    process.env.WAADA_DATA_DIR = dataDir;
    if (groqApiKey) {
      await saveLlmSettings({
        provider: "groq",
        model: "openai/gpt-oss-120b",
        fallbackModel: "openai/gpt-oss-20b",
        credentials: { groq: { apiKey: groqApiKey } },
      });
      console.info("eval LLM: Groq via GROQ_API_KEY");
    } else {
      await copyFile(savedLlmSettings, join(dataDir, "llm.json"));
      console.info("eval LLM: saved .waada/llm.json");
    }
    llm = await createLLM();
    await memory.deleteBank(ACCOUNT).catch(() => {}); // fresh bank, even after a failed run
  }, 2 * MINUTE);

  afterAll(async () => {
    await memory.deleteBank(ACCOUNT).catch(() => {});
    delete process.env.WAADA_DATA_DIR;
    await rm(dataDir, { force: true, recursive: true });
  }, 2 * MINUTE);

  it(
    "parses and ingests all 33 Acme interactions",
    async () => {
      const files = await seedFiles();
      expect(files).toHaveLength(33);

      const started = Date.now();
      const { interactions, errors } = await parseFiles(files, ACCOUNT, { llm });
      console.info(`parseFiles: ${interactions.length} interactions, errors:`, errors);
      expect(errors).toEqual([]);
      expect(interactions).toHaveLength(33);

      const report = await ingest(interactions, deps());
      console.info(`ingest (${Math.round((Date.now() - started) / 1000)} s):`, report);
      expect(report).toEqual({ added: 33, skipped: 0, errors: [] });
    },
    30 * MINUTE,
  );

  it(
    "EVAL-1: Sep 2 SOC 2 commitment is open and first in the brief",
    async () => {
      const started = Date.now();
      result = await brief(ACCOUNT, deps());
      console.info(`brief wall time: ${Math.round((Date.now() - started) / 1000)} s`);
      console.info("commitments:", JSON.stringify(result.commitments, null, 2));
      console.info("brief markdown:\n", result.markdown);
      const first = result.commitments[0];
      expect(first, "at least one commitment").toBeDefined();
      expect(first?.status).toBe("open");
      expect(first?.text).toMatch(/SOC\s?2/i);
      if (first?.date) expect(first.date.slice(0, 10)).toBe("2026-09-02");
    },
    10 * MINUTE,
  );

  it(
    "EVAL-2: delivered pricing proposal has status delivered",
    async () => {
      const ledger = result?.commitments ?? (await brief(ACCOUNT, deps())).commitments;
      const delivered = ledger.find(
        (c) => c.status === "delivered" && deliveredProposal(`${c.text} ${c.evidence}`),
      );
      console.info("delivered commitment:", JSON.stringify(delivered, null, 2));
      expect(delivered, "a delivered commitment").toBeDefined();
    },
    10 * MINUTE,
  );

  it(
    "EVAL-3: pricing landmine present with do-not-reopen guidance",
    async () => {
      const mines = result?.landmines ?? (await brief(ACCOUNT, deps())).landmines;
      console.info("landmines:", JSON.stringify(mines, null, 2));
      const pricing = mines.find((l) =>
        /monthly|annual|pricing/i.test(`${l.topic} ${l.whatHappened} ${l.resolution}`),
      );
      expect(pricing, "a pricing landmine").toBeDefined();
      expect(`${pricing?.guidance} ${pricing?.topic}`).toMatch(/do\s?not|don't|never/i);
    },
    10 * MINUTE,
  );

  it(
    'EVAL-4: ask "What changed since July?" mentions the Q3 → Q4 move',
    async () => {
      const answer = await ask(ACCOUNT, "What changed since July?", deps());
      answerText = answer.text;
      console.info("ask:", JSON.stringify(answer, null, 2));
      expect(answer.text).toMatch(/Q4/i);
    },
    5 * MINUTE,
  );

  it(
    "EVAL-5: scorecard — same checks for Waada, summary-only and CRM-only",
    async () => {
      if (!result) result = await brief(ACCOUNT, deps());
      // Diagnostics (no LLM): how big are the untruncated brief-chat recalls?
      const [stake, recent] = await Promise.all([
        deps().memory.search(
          ACCOUNT,
          "stakeholders, their roles, what each cares about, sentiment",
          { budget: "high" },
        ),
        deps().memory.search(ACCOUNT, "what changed recently, timeline changes", {
          budget: "high",
        }),
      ]);
      console.info(
        `eval diagnostics: stakeholders hits=${stake.length} recent hits=${recent.length} ` +
          `combined chars=${[...stake, ...recent].reduce((n, h) => n + h.text.length, 0)}`,
      );
      columns = await compare(ACCOUNT, deps());
      const table = {
        waada: scoreWaada(result, answerText),
        summary: scoreBaselineMarkdown(columns.summary),
        crm: scoreBaselineMarkdown(columns.crm),
      };
      await writeEvalResult({ ...table, commitments: result.commitments });
      console.info("EVAL SCORECARD (waada / summary / crm):", JSON.stringify(table, null, 2));
      console.info("compare.summary markdown:\n", columns.summary);
      console.info("compare.crm markdown:\n", columns.crm);
      for (const key of ["crm", "summary", "waada"] as const) {
        expect(columns[key].trim().length, key).toBeGreaterThan(0);
      }
    },
    10 * MINUTE,
  );
});
