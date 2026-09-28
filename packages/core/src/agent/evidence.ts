// Shared evidence builder for the M05 extract calls (ledger, landmines).
//
// Eval finding (2026-09-27, Groq free tier): concatenating every high-budget
// recall into one extract() exceeds the provider TPM cap (~8000 tokens), so the
// request can never succeed. Cap the extract input: each recall query keeps a
// per-query share so every query stays represented, with a hard total cap.
//
// Sizing (card 007): the evidence is one slice of the MAX_PROMPT_CHARS budget
// (llm/budget.ts, 20,000 chars ≈ 5,000 input tokens). 8,000 chars of evidence
// (≈ 2,000 tokens) plus the system prompt, user wrapper, JSON schema and the
// structured-output reserve keeps one extract near ~4,000 tokens worst case —
// safely under the 8,000 TPM cap with headroom for tokenizer variance.
import type { MemoryHit } from "../models.ts";

/** ~2k tokens; one extract stays near ~4k tokens incl. output, under the 8k TPM cap. */
export const EVIDENCE_BUDGET_CHARS = 8_000;

/** Chunked ledger pass (P-009, card 014): at most this many budget-sized extracts. */
export const MAX_LEDGER_CHUNKS = 4;

function formatHit(hit: MemoryHit): string {
  return `[${hit.date ?? "undated"}] (${hit.context ?? "no context"}): ${hit.text}`;
}

/** Every deduped evidence line across all recalls, in recall order. */
function dedupeLines(recalls: MemoryHit[][]): string[] {
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const hits of recalls) {
    for (const hit of hits) {
      const key = hit.text.trim().toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      lines.push(formatHit(hit));
    }
  }
  return lines;
}

export function buildEvidence(
  recalls: MemoryHit[][],
  budgetChars: number = EVIDENCE_BUDGET_CHARS,
): { text: string; truncated: boolean } {
  const seen = new Set<string>();
  const perQuery: string[][] = recalls.map((hits) => {
    const lines: string[] = [];
    for (const hit of hits) {
      const key = hit.text.trim().toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      lines.push(`[${hit.date ?? "undated"}] (${hit.context ?? "no context"}): ${hit.text}`);
    }
    return lines;
  });
  const share = Math.max(1, Math.floor(budgetChars / Math.max(recalls.length, 1)));
  let truncated = false;
  const capped = perQuery.map((lines) => {
    const joined = lines.join("\n");
    if (joined.length <= share) return joined;
    truncated = true;
    return `${joined.slice(0, share)}\n… [earlier evidence truncated to the per-query budget]`;
  });
  return { text: capped.filter((s) => s !== "").join("\n"), truncated };
}

/**
 * Splits deduped recall evidence into chunks that each fit `budgetChars`, so
 * the ledger can extract from every chunk instead of truncating to one
 * budget (a single-mention promise in the tail would otherwise be lost).
 * A single hit bigger than the budget keeps its head so it stays
 * represented. Returns at most `maxChunks` chunks; the rest is counted in
 * `dropped` for the caller to log.
 */
export function chunkEvidence(
  recalls: MemoryHit[][],
  budgetChars: number = EVIDENCE_BUDGET_CHARS,
  maxChunks: number = MAX_LEDGER_CHUNKS,
): { chunks: string[]; dropped: number } {
  const lines = dedupeLines(recalls);
  const grouped: string[][] = [];
  let current: string[] = [];
  let currentLen = 0;
  for (let line of lines) {
    if (line.length > budgetChars) {
      line = `${line.slice(0, budgetChars)}\n… [hit truncated to the chunk budget]`;
    }
    const growsBy = current.length === 0 ? line.length : line.length + 1;
    if (current.length > 0 && currentLen + growsBy > budgetChars) {
      grouped.push(current);
      current = [];
      currentLen = 0;
    }
    current.push(line);
    currentLen += current.length === 1 ? line.length : line.length + 1;
  }
  if (current.length > 0) grouped.push(current);
  const kept = grouped.slice(0, Math.max(1, maxChunks));
  const keptLines = kept.reduce((n, g) => n + g.length, 0);
  return { chunks: kept.map((g) => g.join("\n")), dropped: lines.length - keptLines };
}
