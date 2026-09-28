// JSON files under dataDir (AGENTS.md §6.3, S13). Reads are schema-validated; writes are atomic (temp + rename).
import { randomBytes } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { Redis } from "@upstash/redis";
import type { z } from "zod";
import { getEnv } from "./config.ts";
import { ConfigError, WaadaError } from "./errors.ts";
import { log } from "./log.ts";

interface RedisStoreClient {
  get<T>(key: string): Promise<T | null | undefined>;
  set(key: string, value: unknown): Promise<unknown>;
}

let cachedRedis: RedisStoreClient | undefined;
let cachedRedisCredentials: string | undefined;

function redisClient(): RedisStoreClient | undefined {
  const { upstashRedisRestToken: token, upstashRedisRestUrl: url } = getEnv();
  if (!url || !token) return undefined;

  const credentials = `${url}\u0000${token}`;
  if (cachedRedis && cachedRedisCredentials === credentials) return cachedRedis;

  const hasUpstashEnvironment =
    process.env.UPSTASH_REDIS_REST_URL?.trim() && process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  cachedRedis = hasUpstashEnvironment ? Redis.fromEnv() : new Redis({ url, token });
  cachedRedisCredentials = credentials;
  return cachedRedis;
}

function redisKey(relPath: string): string {
  return `waada:${relPath}`;
}

function resolveInDataDir(relPath: string): string {
  const dataDir = getEnv().dataDir;
  const full = resolve(dataDir, relPath);
  const rel = relative(dataDir, full);
  if (isAbsolute(relPath) || rel === "" || rel.startsWith("..") || isAbsolute(rel)) {
    throw new WaadaError(
      `Invalid data file path "${relPath}": it must stay inside the data folder.`,
    );
  }
  return full;
}

export async function readJson<T>(relPath: string, schema: z.ZodType<T>, fallback: T): Promise<T> {
  const file = resolveInDataDir(relPath);
  const redis = redisClient();
  if (redis) {
    let data: unknown;
    try {
      data = await redis.get<unknown>(redisKey(relPath));
    } catch (err) {
      throw new ConfigError(`Could not read data from Redis for ${relPath}.`, { cause: err });
    }
    if (data === null || data === undefined) return fallback;
    const parsed = schema.safeParse(data);
    if (!parsed.success) {
      log.warn("Redis data has an unexpected format; using fallback.", { path: relPath });
      return fallback;
    }
    return parsed.data;
  }
  let raw: string;
  try {
    raw = await readFile(file, "utf8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return fallback;
    throw new ConfigError(`Could not read data file ${relPath}.`, { cause: err });
  }
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    throw new ConfigError(`Data file ${relPath} is not valid JSON. Fix or delete it.`, {
      cause: err,
    });
  }
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    throw new ConfigError(`Data file ${relPath} has an unexpected format. Fix or delete it.`, {
      cause: parsed.error,
    });
  }
  return parsed.data;
}

// On Windows, rename can fail briefly while another process (antivirus, a reader) holds the file.
const RETRYABLE = new Set(["EPERM", "EBUSY", "EACCES"]);

async function renameWithRetry(from: string, to: string): Promise<void> {
  for (let attempt = 0; ; attempt++) {
    try {
      await rename(from, to);
      return;
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code ?? "";
      if (attempt >= 5 || !RETRYABLE.has(code)) throw err;
      await new Promise((r) => setTimeout(r, 20 * 2 ** attempt));
    }
  }
}

export async function writeJson<T>(relPath: string, value: T): Promise<void> {
  const file = resolveInDataDir(relPath);
  const redis = redisClient();
  if (redis) {
    try {
      await redis.set(redisKey(relPath), value);
      return;
    } catch (err) {
      throw new ConfigError(`Could not save data in Redis for ${relPath}.`, { cause: err });
    }
  }
  const tmp = `${file}.${process.pid}.${randomBytes(4).toString("hex")}.tmp`;
  try {
    await mkdir(dirname(file), { recursive: true });
    await writeFile(tmp, `${JSON.stringify(value, null, 2)}\n`, "utf8");
    await renameWithRetry(tmp, file);
  } catch (err) {
    await rm(tmp, { force: true }).catch(() => {});
    throw new ConfigError(`Could not save data file ${relPath}.`, { cause: err });
  }
}
