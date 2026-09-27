// Memory (AGENTS.md §6.4). Only this folder may import @vectorize-io/hindsight-client (AGENTS.md rule 4).
import { HindsightClient } from "@vectorize-io/hindsight-client";
import { getEnv } from "../config.ts";
import { ConfigError } from "../errors.ts";
import type { Interaction, MemoryHit } from "../models.ts";
import { HindsightMemory } from "./hindsight.ts";

export interface Memory {
  ensureBank(account: string): Promise<string>;
  remember(i: Interaction): Promise<void>;
  search(
    account: string,
    query: string,
    opts?: { budget?: "low" | "mid" | "high"; maxResults?: number },
  ): Promise<MemoryHit[]>;
  reflect(account: string, query: string): Promise<string>;
  deleteBank(account: string): Promise<void>;
}

/** Hindsight Cloud or local Docker: only HINDSIGHT_BASE_URL / HINDSIGHT_API_KEY differ. */
export function createMemory(): Memory {
  const { hindsightBaseUrl, hindsightApiKey } = getEnv();
  if (!hindsightBaseUrl) {
    throw new ConfigError(
      "Missing configuration: HINDSIGHT_BASE_URL. Set it in .env (see .env.example).",
    );
  }
  const client = new HindsightClient({
    baseUrl: hindsightBaseUrl,
    ...(hindsightApiKey ? { apiKey: hindsightApiKey } : {}), // local Docker may run without auth
    maxAttempts: 1, // HindsightMemory owns the retry policy
  });
  return new HindsightMemory({ api: client, baseUrl: hindsightBaseUrl });
}
