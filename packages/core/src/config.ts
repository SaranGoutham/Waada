// Environment config (AGENTS.md §6.3). Reads `<project root>/.env`; real env vars win. Never throws at import.
import { existsSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { parseEnv } from "node:util";
import { ConfigError, WaadaError } from "./errors.ts";

const DEFAULT_DATA_DIR = ".waada";

/** Nearest folder at or above cwd containing `pnpm-workspace.yaml`; falls back to cwd. */
export function findProjectRoot(from: string = process.cwd()): string {
  let dir = resolve(from);
  for (;;) {
    if (existsSync(join(dir, "pnpm-workspace.yaml"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return resolve(from);
    dir = parent;
  }
}

function readDotEnv(root: string): Record<string, string | undefined> {
  try {
    return parseEnv(readFileSync(join(root, ".env"), "utf8"));
  } catch {
    return {}; // no .env (or unreadable): real env vars only
  }
}

/** Merged env: `.env` values overridden by real environment variables. Empty strings count as unset. */
function lookup(root: string): (name: string) => string | undefined {
  const fromFile = readDotEnv(root);
  return (name) => {
    const value = process.env[name] ?? fromFile[name];
    return value === undefined || value.trim() === "" ? undefined : value.trim();
  };
}

export function getEnv(): {
  hindsightBaseUrl?: string;
  hindsightApiKey?: string;
  groqApiKey?: string;
  slackBotToken?: string;
  hubspotToken?: string;
  googleCredentialsPath?: string;
  upstashRedisRestUrl?: string;
  upstashRedisRestToken?: string;
  dataDir: string /* default ".waada", resolved to an absolute path under the project root */;
} {
  const root = findProjectRoot();
  const get = lookup(root);
  const dataDir = get("WAADA_DATA_DIR") ?? DEFAULT_DATA_DIR;
  return {
    hindsightBaseUrl: get("HINDSIGHT_BASE_URL"),
    hindsightApiKey: get("HINDSIGHT_API_KEY"),
    groqApiKey: get("GROQ_API_KEY"),
    slackBotToken: get("SLACK_BOT_TOKEN"),
    hubspotToken: get("HUBSPOT_TOKEN"),
    googleCredentialsPath: get("GOOGLE_CREDENTIALS_PATH"),
    // VERIFY: Vercel's Upstash Marketplace may expose these as KV_REST_API_*.
    upstashRedisRestUrl: get("UPSTASH_REDIS_REST_URL") ?? get("KV_REST_API_URL"),
    upstashRedisRestToken: get("UPSTASH_REDIS_REST_TOKEN") ?? get("KV_REST_API_TOKEN"),
    dataDir: isAbsolute(dataDir) ? dataDir : join(root, dataDir),
  };
}

/** Throws ConfigError listing every missing (or empty) variable. */
export function requireEnv(...names: string[]): void {
  const get = lookup(findProjectRoot());
  const missing = names.filter((name) => get(name) === undefined);
  if (missing.length > 0) {
    throw new ConfigError(
      `Missing configuration: ${missing.join(", ")}. Set ${missing.length === 1 ? "it" : "them"} in .env (see .env.example).`,
    );
  }
}

/** "Café Säo, Inc." → "cafe-sao-inc". Throws WaadaError if nothing usable remains. */
export function slugify(name: string): string {
  const slug = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (slug === "") {
    throw new WaadaError(`"${name}" can't be used as an account name: it needs letters or digits.`);
  }
  return slug;
}

/** "Acme Corp" → "waada-acme-corp" */
export function bankIdFor(account: string): string {
  return `waada-${slugify(account)}`;
}
