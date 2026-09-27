// End-to-end live test (M10 step 1): seed/acme → parseFiles → ingest → brief → ask → compare,
// against real Hindsight + the configured LLM. Runs only with `pnpm test:live`.
//
// Needs HINDSIGHT_BASE_URL (+ HINDSIGHT_API_KEY for Cloud) and an LLM: GROQ_API_KEY (env or .env),
// else the saved `.waada/llm.json` from Settings → LLM. Skips with a note when either is missing.
//
// Isolation: the agent sees account "acme" (so baselines read seed/acme/crm.json), but a memory
// wrapper stores everything in bank "waada-acme-e2e", leaving a UI-imported "acme" bank untouched.
// The dedupe manifest and LLM settings live in a temp data dir. Retains are sync (~10–20 s each on
// Cloud), so the ingest step takes several minutes.
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
import { saveLlmSettings } from "../src/llm/settings.ts";
import { createMemory, type Memory } from "../src/memory/index.ts";
import type { Brief, FileInput, Interaction } from "../src/models.ts";

const ACCOUNT = "acme";
const BANK_SUFFIX = "-e2e";
const SEED = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "seed", ACCOUNT);
const MINUTE = 60_000;

const root = findProjectRoot();
const realDataDir = getEnv().dataDir; // read before WAADA_DATA_DIR is pointed at the temp dir
const groqApiKey = process.env.GROQ_API_KEY?.trim() || dotEnv().GROQ_API_KEY?.trim() || "";
const savedLlmSettings = join(realDataDir, "llm.json");
const hasHindsight = Boolean(getEnv().hindsightBaseUrl);
const hasLlm = Boolean(groqApiKey) || (await exists(savedLlmSettings));
const live = hasHindsight && hasLlm ? describe : describe.skip;
if (!hasHindsight) console.info("e2e skipped: HINDSIGHT_BASE_URL is not set (.env)");
if (!hasLlm) console.info("e2e skipped: no GROQ_API_KEY and no saved .waada/llm.json");

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

/** Same Memory, but every account maps to "<account>-e2e" so the real bank is never touched. */
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

/** The 33 Acme source files, named as ingest-seed.test.ts names them (Slack keeps its channel folder). */
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

live("e2e: seed/acme through real Hindsight + LLM", () => {
  const memory = isolatedMemory(createMemory());
  const deps = { memory };
  let dataDir: string;
  let result: Brief | undefined;

  beforeAll(async () => {
    dataDir = await mkdtemp(join(tmpdir(), "waada-e2e-"));
    process.env.WAADA_DATA_DIR = dataDir;
    if (groqApiKey) {
      await saveLlmSettings({
        provider: "groq",
        model: "openai/gpt-oss-120b",
        fallbackModel: "qwen/qwen3-32b",
        credentials: { groq: { apiKey: groqApiKey } },
      });
      console.info("e2e LLM: Groq via GROQ_API_KEY");
    } else {
      await copyFile(savedLlmSettings, join(dataDir, "llm.json"));
      console.info("e2e LLM: saved .waada/llm.json");
    }
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
      const { interactions, errors } = await parseFiles(files, ACCOUNT);
      console.info(`parseFiles: ${interactions.length} interactions, errors:`, errors);
      expect(errors).toEqual([]);
      expect(interactions).toHaveLength(33);

      const report = await ingest(interactions, deps);
      console.info(`ingest (${Math.round((Date.now() - started) / 1000)} s):`, report);
      expect(report).toEqual({ added: 33, skipped: 0, errors: [] });
    },
    30 * MINUTE,
  );

  it(
    "brief leads with the open Sep 2 SOC 2 commitment and has the pricing landmine",
    async () => {
      result = await brief(ACCOUNT, deps);
      console.info("commitments:", JSON.stringify(result.commitments, null, 2));
      console.info("landmines:", JSON.stringify(result.landmines, null, 2));
      console.info("brief markdown:\n", result.markdown);

      const first = result.commitments[0];
      expect(first, "at least one commitment").toBeDefined();
      expect(first?.status).toBe("open");
      expect(first?.text).toMatch(/SOC\s?2/i);
      if (first?.date) expect(first.date.slice(0, 10)).toBe("2026-09-02");

      const pricing = result.landmines.find((l) =>
        /monthly|annual|pricing/i.test(`${l.topic} ${l.whatHappened} ${l.resolution}`),
      );
      expect(pricing, "a pricing landmine").toBeDefined();
      expect(result.markdown.trim().length).toBeGreaterThan(0);
    },
    10 * MINUTE,
  );

  it(
    'ask "What changed since July?" returns the Q3 → Q4 go-live move',
    async () => {
      const answer = await ask(ACCOUNT, "What changed since July?", deps);
      console.info("ask:", JSON.stringify(answer, null, 2));
      expect(answer.text).toMatch(/Q4/i);
    },
    5 * MINUTE,
  );

  it(
    "compare returns three non-empty columns",
    async () => {
      const columns = await compare(ACCOUNT, deps);
      console.info("compare:", JSON.stringify(columns, null, 2));
      for (const key of ["crm", "summary", "waada"] as const) {
        expect(columns[key].trim().length, key).toBeGreaterThan(0);
      }
    },
    10 * MINUTE,
  );
});
