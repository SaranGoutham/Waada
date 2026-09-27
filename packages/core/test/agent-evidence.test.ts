import { describe, expect, it } from "vitest";
import { buildEvidence, EVIDENCE_BUDGET_CHARS } from "../src/agent/evidence.ts";
import { LEDGER_SYSTEM, ledgerUser } from "../src/agent/prompts.ts";
import { MAX_PROMPT_CHARS } from "../src/llm/budget.ts";
import type { MemoryHit } from "../src/models.ts";

function hit(text: string, n: number): MemoryHit {
  return {
    text,
    date: `2026-09-${String(n).padStart(2, "0")}T10:00:00.000Z`,
    context: `call — Item ${n}`,
    documentId: `file:${n}`,
  };
}

describe("buildEvidence", () => {
  it("dedupes identical hit text across queries", () => {
    const { text, truncated } = buildEvidence([[hit("same promise", 1)], [hit("same promise", 2)]]);
    expect(text.split("same promise").length - 1).toBe(1);
    expect(truncated).toBe(false);
  });

  it("caps each query at its share of the budget and flags truncation", () => {
    const big = `x`.repeat(EVIDENCE_BUDGET_CHARS);
    const { text, truncated } = buildEvidence([[hit(big, 1)], [hit("small", 2)]]);
    expect(truncated).toBe(true);
    expect(text).toContain("small");
    expect(text.length).toBeLessThanOrEqual(EVIDENCE_BUDGET_CHARS + 200);
  });

  it("keeps every query represented when all are small", () => {
    const { text, truncated } = buildEvidence([
      [hit("first query item", 1)],
      [hit("second query item", 2)],
      [hit("third query item", 3)],
    ]);
    expect(truncated).toBe(false);
    expect(text).toMatch(/first query item/);
    expect(text).toMatch(/second query item/);
    expect(text).toMatch(/third query item/);
  });

  it("keeps a full-size ledger extract prompt inside the per-request budget", () => {
    const { text } = buildEvidence([[hit("x".repeat(EVIDENCE_BUDGET_CHARS), 1)]]);
    const prompt = LEDGER_SYSTEM + ledgerUser(text);
    expect(prompt.length).toBeLessThanOrEqual(MAX_PROMPT_CHARS);
  });
});
