// Free-tier token budget (M02, card 007): one documented constant caps every
// prompt we send. No network.
import { describe, expect, it } from "vitest";
import {
  CHARS_PER_TOKEN,
  estimateTokens,
  MAX_INPUT_TOKENS,
  MAX_PROMPT_CHARS,
  truncateForBudget,
} from "../src/llm/budget.ts";

describe("token budget", () => {
  it("caps prompts at 5,000 input tokens via the chars/4 estimate", () => {
    expect(CHARS_PER_TOKEN).toBe(4);
    expect(MAX_INPUT_TOKENS).toBe(5_000);
    expect(MAX_PROMPT_CHARS).toBe(20_000);
    expect(estimateTokens("x".repeat(20_000))).toBe(5_000);
  });

  it("keeps text within the budget unchanged", () => {
    expect(truncateForBudget("short", 60_000)).toBe("short");
  });

  it("keeps the most recent content when over budget", () => {
    const out = truncateForBudget("x".repeat(100), 40);
    expect(out).toContain("x".repeat(40));
    expect(out).not.toContain("x".repeat(41));
    expect(out).toMatch(/omitted/i);
  });
});
