// 429 retry (M02, card 007): 429 → retry-after wait (cap 60 s), ≤ 2 retries,
// never 413. No network, no real waiting: the sleep is injected and recorded.
import { APICallError } from "ai";
import { describe, expect, it } from "vitest";
import {
  isRateLimitError,
  isTooLargeError,
  RATE_LIMIT_DEFAULT_DELAY_MS,
  retryAfterMs,
  withRateLimitRetry,
} from "../src/llm/retry.ts";

function rateLimit(headers: Record<string, string> = { "retry-after": "2" }): Error {
  return {
    name: "RateLimit",
    message: "too many tokens",
    statusCode: 429,
    responseHeaders: headers,
  } as unknown as Error;
}

function tooLarge(): Error {
  return { name: "TooLarge", message: "request too large", statusCode: 413 } as unknown as Error;
}

function recorder() {
  const waits: number[] = [];
  const sleep = (ms: number): Promise<void> => {
    waits.push(ms);
    return Promise.resolve();
  };
  return { waits, sleep };
}

describe("isRateLimitError / isTooLargeError", () => {
  it("detects 429 and 413 by status code", () => {
    expect(isRateLimitError(rateLimit())).toBe(true);
    expect(isTooLargeError(rateLimit())).toBe(false);
    expect(isRateLimitError(tooLarge())).toBe(false);
    expect(isTooLargeError(tooLarge())).toBe(true);
    expect(isRateLimitError(new Error("plain failure"))).toBe(false);
    expect(isTooLargeError(new Error("plain failure"))).toBe(false);
  });

  it("detects a real APICallError 429", () => {
    const err = new APICallError({
      message: "rate limited",
      url: "https://api.groq.com/test",
      requestBodyValues: {},
      statusCode: 429,
      responseHeaders: { "retry-after": "3" },
    });
    expect(isRateLimitError(err)).toBe(true);
    expect(retryAfterMs(err)).toBe(3_000);
  });
});

describe("retryAfterMs", () => {
  it("reads retry-after seconds", () => {
    expect(retryAfterMs(rateLimit({ "retry-after": "7" }))).toBe(7_000);
  });

  it("prefers retry-after-ms", () => {
    expect(retryAfterMs(rateLimit({ "retry-after": "30", "retry-after-ms": "1500" }))).toBe(1_500);
  });

  it("caps the wait at 60 s", () => {
    expect(retryAfterMs(rateLimit({ "retry-after": "600" }))).toBe(60_000);
  });

  it("uses the default delay when the headers are missing or junk", () => {
    expect(retryAfterMs(rateLimit({}))).toBe(RATE_LIMIT_DEFAULT_DELAY_MS);
    expect(retryAfterMs(rateLimit({ "retry-after": "soon" }))).toBe(RATE_LIMIT_DEFAULT_DELAY_MS);
    expect(retryAfterMs(new Error("plain failure"))).toBe(RATE_LIMIT_DEFAULT_DELAY_MS);
  });
});

describe("withRateLimitRetry", () => {
  it("waits retry-after once, then returns success (429 then success)", async () => {
    const { waits, sleep } = recorder();
    let calls = 0;
    const result = await withRateLimitRetry(
      () => {
        calls += 1;
        if (calls === 1) throw rateLimit({ "retry-after": "2" });
        return Promise.resolve("recovered");
      },
      { sleep },
    );
    expect(result).toBe("recovered");
    expect(calls).toBe(2);
    expect(waits).toEqual([2_000]);
  });

  it("never retries 413", async () => {
    const { waits, sleep } = recorder();
    let calls = 0;
    await expect(
      withRateLimitRetry(
        () => {
          calls += 1;
          throw tooLarge();
        },
        { sleep },
      ),
    ).rejects.toThrow("request too large");
    expect(calls).toBe(1);
    expect(waits).toEqual([]);
  });

  it("rethrows plain failures immediately without sleeping", async () => {
    const { waits, sleep } = recorder();
    let calls = 0;
    await expect(
      withRateLimitRetry(
        () => {
          calls += 1;
          throw new Error("provider unavailable");
        },
        { sleep },
      ),
    ).rejects.toThrow("provider unavailable");
    expect(calls).toBe(1);
    expect(waits).toEqual([]);
  });

  it("retries at most twice, then throws the last 429", async () => {
    const { waits, sleep } = recorder();
    let calls = 0;
    await expect(
      withRateLimitRetry(
        () => {
          calls += 1;
          throw rateLimit({ "retry-after": "1" });
        },
        { sleep },
      ),
    ).rejects.toThrow("too many tokens");
    expect(calls).toBe(3); // 1 initial + 2 retries
    expect(waits).toEqual([1_000, 1_000]);
  });
});
