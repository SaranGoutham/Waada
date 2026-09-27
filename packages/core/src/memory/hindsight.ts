// Memory (AGENTS.md §6.4) backed by Hindsight. Talks to the client only through HindsightApi,
// a narrow slice of HindsightClient, so tests can inject a fake.
import { bankIdFor } from "../config.ts";
import { ExternalServiceError, WaadaError } from "../errors.ts";
import { createLogger } from "../log.ts";
import type { Interaction, MemoryHit } from "../models.ts";
import type { Memory } from "./index.ts";

const log = createLogger("memory");

export const BANK_MISSION =
  "You are the continuity memory for a B2B sales deal. Track what the prospect said, what our team promised and whether it was delivered, objections raised and how they were resolved, stakeholder roles and sentiment, and how things changed over time.";

/** One recall result: the fields of the SDK's RecallResult that we read. */
export type RecallHit = {
  text: string;
  context?: string | null;
  occurred_start?: string | null;
  mentioned_at?: string | null;
  document_id?: string | null;
};

/** The HindsightClient methods we use (SDK 0.10.1). HindsightClient satisfies this structurally. */
export interface HindsightApi {
  createBank(
    bankId: string,
    options: { reflectMission?: string; retainMission?: string },
  ): Promise<unknown>;
  retain(
    bankId: string,
    content: string,
    options: {
      context?: string;
      timestamp?: string;
      documentId?: string;
      metadata?: Record<string, string>;
      async?: boolean;
    },
  ): Promise<unknown>;
  recall(
    bankId: string,
    query: string,
    options: { budget?: "low" | "mid" | "high" },
  ): Promise<{ results: RecallHit[] }>;
  reflect(bankId: string, query: string): Promise<{ text: string }>;
  deleteBank(bankId: string): Promise<void>;
}

/** Any parseable date → UTC ISO with Z; missing or junk → null. */
export function toIsoOrNull(value: string | null | undefined): string | null {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? null : new Date(ms).toISOString();
}

/** HTTP status from the SDK's HindsightError (statusCode); undefined for network failures and plain Errors. */
function statusOf(err: unknown): number | undefined {
  const status = (err as { statusCode?: unknown } | null)?.statusCode;
  return typeof status === "number" ? status : undefined;
}

/** Network failures (no status) and 5xx are worth one retry; 4xx are not. */
function isRetryable(err: unknown): boolean {
  const status = statusOf(err);
  return status === undefined || status >= 500;
}

/** Log-safe error description: SDK messages can echo request details, so never log them. */
function errorName(err: unknown): string {
  return err instanceof Error ? err.name : typeof err;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export class HindsightMemory implements Memory {
  readonly #api: HindsightApi;
  readonly #baseUrl: string;
  readonly #retryDelayMs: number;
  readonly #knownBanks = new Set<string>();

  constructor(options: { api: HindsightApi; baseUrl: string; retryDelayMs?: number }) {
    this.#api = options.api;
    this.#baseUrl = options.baseUrl;
    this.#retryDelayMs = options.retryDelayMs ?? 500;
  }

  async ensureBank(account: string): Promise<string> {
    const bankId = bankIdFor(account);
    if (this.#knownBanks.has(bankId)) return bankId;
    // createBank is create-or-update (PUT), so calling it for an existing bank is harmless.
    await this.#call("createBank", () =>
      this.#api.createBank(bankId, { reflectMission: BANK_MISSION, retainMission: BANK_MISSION }),
    );
    this.#knownBanks.add(bankId);
    return bankId;
  }

  async remember(i: Interaction): Promise<void> {
    const bankId = await this.ensureBank(i.account);
    // Retrying synchronous retain is safe: every call sends a documentId, and the API replaces
    // a document with the same id by default (update_mode "replace").
    await this.#call("retain", () =>
      this.#api.retain(bankId, i.content, {
        context: `${i.type} — ${i.title}`,
        timestamp: i.date,
        documentId: i.sourceId,
        // Hindsight metadata values must be strings.
        metadata: {
          type: i.type,
          participants: i.participants.join(", "),
          account: i.account,
          source: i.source,
        },
        async: false, // wait for extraction so demos are deterministic
      }),
    );
  }

  async search(
    account: string,
    query: string,
    opts?: { budget?: "low" | "mid" | "high"; maxResults?: number },
  ): Promise<MemoryHit[]> {
    const response = await this.#call("recall", () =>
      this.#api.recall(bankIdFor(account), query, { budget: opts?.budget ?? "mid" }),
    );
    const hits = response.results.map(
      (r): MemoryHit => ({
        text: r.text,
        date: toIsoOrNull(r.occurred_start) ?? toIsoOrNull(r.mentioned_at),
        context: r.context ?? null,
        documentId: r.document_id ?? null,
      }),
    );
    return opts?.maxResults === undefined ? hits : hits.slice(0, opts.maxResults);
  }

  async reflect(account: string, query: string): Promise<string> {
    const response = await this.#call("reflect", () =>
      this.#api.reflect(bankIdFor(account), query),
    );
    return response.text;
  }

  async deleteBank(account: string): Promise<void> {
    const bankId = bankIdFor(account);
    await this.#call("deleteBank", () => this.#api.deleteBank(bankId));
    this.#knownBanks.delete(bankId);
  }

  /** Runs one client call: one retry on network/5xx errors, then a friendly WaadaError. */
  async #call<T>(op: string, fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (first) {
      if (first instanceof WaadaError || !isRetryable(first)) throw this.#friendly(op, first);
      log.debug(`${op} failed, retrying once`, {
        status: statusOf(first),
        error: errorName(first),
      });
      await sleep(this.#retryDelayMs);
      try {
        return await fn();
      } catch (second) {
        throw this.#friendly(op, second);
      }
    }
  }

  #friendly(op: string, err: unknown): WaadaError {
    if (err instanceof WaadaError) return err;
    const status = statusOf(err);
    log.debug(`${op} failed`, { status, error: errorName(err) });
    if (status === 401 || status === 403) {
      return new ExternalServiceError(
        `Hindsight rejected the API key (HTTP ${status}). Check HINDSIGHT_API_KEY in .env.`,
        { cause: err },
      );
    }
    const suffix = status === undefined ? "" : ` (HTTP ${status})`;
    return new ExternalServiceError(
      `Couldn't reach Hindsight at ${this.#baseUrl}${suffix}. Is the server running / is the API key right?`,
      { cause: err },
    );
  }
}
