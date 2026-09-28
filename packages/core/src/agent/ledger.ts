// commitmentLedger (M05): recall → chunk → extract each chunk → merge → sort.
import { z } from "zod";
import { createLLM } from "../llm/index.ts";
import { createLogger } from "../log.ts";
import { createMemory } from "../memory/index.ts";
import type { Commitment as CommitmentT } from "../models.ts";
import { Commitment } from "../models.ts";
import { chunkEvidence, MAX_LEDGER_CHUNKS } from "./evidence.ts";
import type { AgentDeps } from "./index.ts";
import { LEDGER_SYSTEM, ledgerUser } from "./prompts.ts";

const log = createLogger("agent");

const LEDGER_QUERIES = [
  "commitments or promises our team made to the customer",
  "documents, proposals or materials we sent or delivered",
  "follow-ups we owe the customer",
  "things the customer is still waiting for",
];

const STATUS_RANK = { open: 0, unclear: 1, delivered: 2 } as const;

type LedgerNow = string | number | Date;

function nowMs(now?: LedgerNow): number {
  if (now === undefined) return Date.now();
  return now instanceof Date ? now.getTime() : Date.parse(now as string);
}

/**
 * Overdue-first (P-009): open items past their dueDate come first (most
 * overdue on top), then open items with a future dueDate (soonest first),
 * then open items with no dueDate (newest promise first, dateless last).
 * Unclear and delivered keep their groups after every open item.
 * `now` is injectable so tests don't depend on the wall clock.
 */
function sortLedger(commitments: CommitmentT[], now?: LedgerNow): CommitmentT[] {
  const nowTime = nowMs(now);
  const dueMs = (c: CommitmentT): number | null => {
    if (c.dueDate === null) return null;
    const ms = Date.parse(c.dueDate);
    return Number.isNaN(ms) ? null : ms;
  };
  const dateMs = (c: CommitmentT): number | null => {
    if (c.date === null) return null;
    const ms = Date.parse(c.date);
    return Number.isNaN(ms) ? null : ms;
  };
  return commitments
    .map((c, index) => ({ c, index }))
    .sort((a, b) => {
      const rank = STATUS_RANK[a.c.status] - STATUS_RANK[b.c.status];
      if (rank !== 0) return rank;
      if (a.c.status === "open") {
        const aDue = dueMs(a.c);
        const bDue = dueMs(b.c);
        const aOverdue = aDue !== null && aDue < nowTime;
        const bOverdue = bDue !== null && bDue < nowTime;
        if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
        if (aOverdue && bOverdue && aDue !== bDue) return (aDue as number) - (bDue as number);
        const aUpcoming = aDue !== null && !aOverdue;
        const bUpcoming = bDue !== null && !bOverdue;
        if (aUpcoming !== bUpcoming) return aUpcoming ? -1 : 1;
        if (aUpcoming && bUpcoming && aDue !== bDue) return (aDue as number) - (bDue as number);
        const aDate = dateMs(a.c);
        const bDate = dateMs(b.c);
        if (aDate === bDate) return a.index - b.index;
        if (aDate === null) return 1;
        if (bDate === null) return -1;
        return aDate > bDate ? -1 : 1;
      }
      return a.index - b.index;
    })
    .map((x) => x.c);
}

/** Same deliverable = same normalised promise text to the same recipient. */
function mergeKey(c: CommitmentT): string {
  const norm = (s: string) =>
    s
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  return `${norm(c.text)}|${norm(c.madeTo)}`;
}

/**
 * Merges per-chunk extracts into one ledger. The same deliverable seen in
 * several chunks becomes one item: if any chunk shows it delivered, it is
 * delivered (delivery proof may sit in a different chunk than the promise),
 * and a missing dueDate is backfilled from a duplicate that has one.
 * First-seen order is kept; the final sort decides display order.
 */
export function mergeCommitments(items: CommitmentT[]): CommitmentT[] {
  const byKey = new Map<string, CommitmentT>();
  for (const c of items) {
    const key = mergeKey(c);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, c);
      continue;
    }
    byKey.set(key, {
      ...existing,
      status: c.status === "delivered" ? "delivered" : existing.status,
      evidence: c.status === "delivered" ? c.evidence : existing.evidence,
      source: c.status === "delivered" ? c.source : existing.source,
      dueDate: existing.dueDate ?? c.dueDate,
    });
  }
  return [...byKey.values()];
}

export async function commitmentLedger(
  account: string,
  deps?: AgentDeps,
  now?: string | number | Date,
): Promise<CommitmentT[]> {
  const memory = deps?.memory ?? createMemory();
  const llm = deps?.llm ?? (await createLLM());
  const recalls = await Promise.all(
    LEDGER_QUERIES.map((query) => memory.search(account, query, { budget: "high" })),
  );
  // Chunked pass (P-009): one extract per budget-sized chunk, one after
  // another (sequential LLM calls fit the free-tier TPM cap). A promise
  // mentioned once in the tail survives because every chunk is extracted.
  const { chunks, dropped } = chunkEvidence(recalls);
  if (dropped > 0) {
    log.info(`commitmentLedger: dropped ${dropped} evidence hits beyond the chunk cap`, {
      account,
      chunks: chunks.length,
      cap: MAX_LEDGER_CHUNKS,
    });
  }
  const seen: CommitmentT[] = [];
  for (const [index, chunk] of chunks.entries()) {
    const result = await llm.extract({
      system: LEDGER_SYSTEM,
      user: ledgerUser(chunk),
      schema: z.object({ commitments: z.array(Commitment) }),
      name: "commitments",
      description: "Commitments our team made to the customer",
    });
    if (!result) {
      log.warn("commitmentLedger: chunk extract returned no valid object", {
        account,
        chunk: index + 1,
        chunks: chunks.length,
      });
      continue;
    }
    seen.push(...result.commitments);
  }
  return sortLedger(mergeCommitments(seen), now);
}
