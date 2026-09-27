// 429 (rate-limit) retry for the LLM layer (M02, card 007).
//
// AI SDK behaviour (verified in node_modules/ai v7: `generateText` /
// `generateObject` accept `maxRetries`, default 2, and retry retryable errors
// — 408/409/429/5xx — with exponential backoff that honours the `retry-after`
// / `retry-after-ms` response headers, ignoring delays ≥ 60 s). To avoid
// double-retrying, every SDK call routed through `withRateLimitRetry` passes
// `maxRetries: 0`: this module is the single retry layer, with exactly the
// card's semantics — on 429 wait for `retry-after` (capped at 60 s) and retry
// at most 2 times, then let the caller fall back or throw. 413 (request too
// large) is never retryable and is rethrown immediately, as is any other
// non-429 failure.
//
// Other retryable provider errors (5xx / network, i.e. `isRetryable` without a
// 429 status) share the same 2-retry budget with SDK-style exponential
// backoff (2 s, 4 s) so disabling the SDK layer does not regress them.
import { APICallError } from "ai";

export const RATE_LIMIT_MAX_RETRIES = 2;

/** Longest we ever wait for one `retry-after` hint. */
export const RATE_LIMIT_MAX_DELAY_MS = 60_000;

/** Wait when a 429 carries no usable `retry-after` hint (matches SDK initial backoff). */
export const RATE_LIMIT_DEFAULT_DELAY_MS = 2_000;

export type Sleep = (ms: number) => Promise<void>;

const defaultSleep: Sleep = (ms) => new Promise<void>((resolve) => setTimeout(resolve, ms));

type RateLimitInfo = { statusCode?: number; headers?: Record<string, string> };

/** Extracts status + headers from APICallError, or from a RetryError wrapping one. */
function rateLimitInfo(error: unknown): RateLimitInfo {
  const candidates = [error, (error as { lastError?: unknown } | null)?.lastError];
  for (const candidate of candidates) {
    if (APICallError.isInstance(candidate)) {
      return { statusCode: candidate.statusCode, headers: candidate.responseHeaders };
    }
    const statusCode = (candidate as { statusCode?: unknown } | null)?.statusCode;
    if (typeof statusCode === "number") {
      const headers = (candidate as { responseHeaders?: unknown } | null)?.responseHeaders;
      return {
        statusCode,
        headers:
          headers !== null && typeof headers === "object"
            ? (headers as Record<string, string>)
            : undefined,
      };
    }
  }
  return {};
}

export function isRateLimitError(error: unknown): boolean {
  return rateLimitInfo(error).statusCode === 429;
}

/** True for 413 "request too large": retrying can never succeed. Never retry. */
export function isTooLargeError(error: unknown): boolean {
  return rateLimitInfo(error).statusCode === 413;
}

/**
 * Milliseconds to wait for a 429, from `retry-after-ms` (preferred) or
 * `retry-after` (seconds, else an HTTP date), capped at 60 s. Falls back to
 * the default delay when the headers are missing or unparseable.
 */
export function retryAfterMs(error: unknown, now: number = Date.now()): number {
  const headers = rateLimitInfo(error).headers;
  if (headers) {
    const msHint = headers["retry-after-ms"];
    if (msHint !== undefined) {
      const ms = Number.parseFloat(msHint);
      if (!Number.isNaN(ms) && ms >= 0) return Math.min(ms, RATE_LIMIT_MAX_DELAY_MS);
    }
    const hint = headers["retry-after"];
    if (hint !== undefined) {
      const seconds = Number.parseFloat(hint);
      if (!Number.isNaN(seconds) && seconds >= 0) {
        return Math.min(seconds * 1_000, RATE_LIMIT_MAX_DELAY_MS);
      }
      const dateMs = Date.parse(hint) - now;
      if (!Number.isNaN(dateMs) && dateMs >= 0) return Math.min(dateMs, RATE_LIMIT_MAX_DELAY_MS);
    }
  }
  return RATE_LIMIT_DEFAULT_DELAY_MS;
}

function isRetryableProviderError(error: unknown): boolean {
  if (APICallError.isInstance(error)) return error.isRetryable;
  return false;
}

/**
 * Runs `fn`, retrying 429s with the server's `retry-after` wait (capped 60 s)
 * and other retryable provider errors with 2 s / 4 s backoff, at most
 * `maxRetries` retries total. Everything else — including 413 — is rethrown
 * immediately. `sleep` is injectable so unit tests never really wait.
 */
export async function withRateLimitRetry<T>(
  fn: () => Promise<T>,
  opts: { maxRetries?: number; sleep?: Sleep } = {},
): Promise<T> {
  const maxRetries = opts.maxRetries ?? RATE_LIMIT_MAX_RETRIES;
  const sleep = opts.sleep ?? defaultSleep;
  let attempt = 0;
  for (;;) {
    try {
      return await fn();
    } catch (error) {
      if (attempt >= maxRetries || isTooLargeError(error)) throw error;
      const retryable = isRateLimitError(error) || isRetryableProviderError(error);
      if (!retryable) throw error;
      attempt += 1;
      const delay = isRateLimitError(error) ? retryAfterMs(error) : 2_000 * 2 ** (attempt - 1);
      await sleep(delay);
    }
  }
}
