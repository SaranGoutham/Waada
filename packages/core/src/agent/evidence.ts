// Shared evidence builder for the M05 extract calls (ledger, landmines).
//
// Eval finding (2026-09-27, Groq free tier): concatenating every high-budget
// recall into one extract() exceeds the provider TPM cap (~8000 tokens), so the
// request can never succeed. Cap the extract input: each recall query keeps a
// per-query share so every query stays represented, with a hard total cap.
import type { MemoryHit } from "../models.ts";

/** ~3k tokens; one extract stays near ~4.5k tokens incl. output, under the 8k TPM cap. */
export const EVIDENCE_BUDGET_CHARS = 12_000;

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
