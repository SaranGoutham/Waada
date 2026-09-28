import { describe, expect, it } from "vitest";
import {
  buildEvidence,
  chunkEvidence,
  EVIDENCE_BUDGET_CHARS,
  MAX_LEDGER_CHUNKS,
} from "../src/agent/evidence.ts";
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

describe("chunkEvidence", () => {
  it("returns one chunk when everything fits", () => {
    const { chunks, dropped } = chunkEvidence([[hit("first", 1)], [hit("second", 2)]]);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toMatch(/first/);
    expect(chunks[0]).toMatch(/second/);
    expect(dropped).toBe(0);
  });

  it("packs lines in order into budget-sized chunks", () => {
    const recalls = [[hit("a".repeat(100), 1), hit("b".repeat(100), 2), hit("c".repeat(100), 3)]];
    const { chunks, dropped } = chunkEvidence(recalls, 250, 4);
    expect(dropped).toBe(0);
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) expect(chunk.length).toBeLessThanOrEqual(250 + 100);
    expect(chunks.join("\n")).toMatch(/a+.*b+.*c+/s);
  });

  it("dedupes identical hit text across queries before chunking", () => {
    const { chunks, dropped } = chunkEvidence(
      [[hit("same promise", 1)], [hit("same promise", 2)]],
      1000,
    );
    expect(chunks.join("\n").split("same promise").length - 1).toBe(1);
    expect(dropped).toBe(0);
  });

  it("keeps an over-budget single hit represented by its head", () => {
    const { chunks, dropped } = chunkEvidence([[hit("z".repeat(500), 1)]], 100, 4);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toContain("z");
    expect(chunks[0]).toMatch(/truncat/i);
    expect(dropped).toBe(0);
  });

  it("caps the chunk count and reports dropped hits", () => {
    const recalls = [[1, 2, 3, 4, 5, 6].map((n) => hit(`item-${n} `.repeat(20), n))];
    const { chunks, dropped } = chunkEvidence(recalls, 200, 2);
    expect(chunks).toHaveLength(2);
    expect(MAX_LEDGER_CHUNKS).toBe(4);
    expect(dropped).toBeGreaterThan(0);
    expect(chunks.join("\n")).toMatch(/item-1/);
  });

  it("returns no chunks for empty recalls", () => {
    expect(chunkEvidence([[], []])).toEqual({ chunks: [], dropped: 0 });
  });
});
