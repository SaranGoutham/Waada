// Free-tier token budget (M05 + M02, card 007).
//
// The human decided Waada must work with a free Groq key: 8,000 tokens per
// minute on `openai/gpt-oss-120b`. A single request at or over that limit
// fails with HTTP 413 and can never succeed, so every prompt we send must stay
// well under it, and bursts that exhaust the rolling per-minute window are
// absorbed by waiting out `retry-after` (see `llm/retry.ts`), not by shrinking
// below usefulness.
//
// Run D measured Groq requesting 8,517 tokens for a 20,000-character prompt:
// about 2.35 characters per requested token. Use 2.5 characters per token,
// rather than the former optimistic chars/4 estimate, so the cap has room for
// provider tokenization and structured-output overhead.
export const CHARS_PER_TOKEN = 2.5;

/** Rough input-token estimate for a prompt string. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/**
 * Largest prompt (system + user) any single LLM request may send: 5,000 input
 * tokens. Expected output (a structured list or one brief) adds roughly
 * another ≤ 1,000 tokens, so a request stays near ~6,000 tokens worst case —
 * under the 8,000 TPM cap with headroom for tokenizer variance. Every
 * call-site slice below (extract evidence, brief recall context, summary
 * baseline) is sized so system + user fits this constant.
 */
export const MAX_INPUT_TOKENS = 5_000;

/** Same budget in characters, via the conservative chars/2.5 estimate. */
export const MAX_PROMPT_CHARS = MAX_INPUT_TOKENS * CHARS_PER_TOKEN; // 12,500

/**
 * Keeps the most recent `budget` characters and notes what was dropped.
 * Recall hits arrive relevance-ranked, so tail truncation drops the
 * least-relevant hits; raw transcripts arrive oldest-first, so it keeps the
 * most recent history.
 */
export function truncateForBudget(text: string, budget: number): string {
  if (text.length <= budget) return text;
  const kept = text.slice(text.length - budget);
  return `… [showing the most recent ${budget} of ${text.length} characters; earlier text omitted]\n${kept}`;
}
