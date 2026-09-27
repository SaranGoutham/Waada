import { describe, expect, it } from "vitest";
import { landmines } from "../src/agent/index.ts";
import type { Landmine } from "../src/models.ts";
import { FakeLLM, FakeMemory, sampleInteractions } from "./fakes.ts";

const PRICING: Landmine = {
  topic: "Monthly pricing",
  whatHappened: "Bhavana pushed for monthly pricing on the pricing call.",
  resolution: "Acme accepted annual billing with an 8% discount.",
  date: "2026-08-20T10:00:00.000Z",
  guidance: "Do NOT re-open monthly pricing; annual billing + 8% was accepted.",
  source: "call — Call #2 — pricing discussion",
};

async function seededMemory(): Promise<FakeMemory> {
  const mem = new FakeMemory();
  for (const i of sampleInteractions()) await mem.remember(i);
  return mem;
}

describe("landmines", () => {
  it("recalls the objection/resolution/acceptance query sets with a high budget", async () => {
    const mem = await seededMemory();
    const llm = new FakeLLM({ extract: { landmines: [{ landmines: [] }] } });
    await landmines("acme", { memory: mem, llm });
    const searches = mem.calls.filter((c) => c.method === "search");
    expect(searches).toHaveLength(3);
    const queries = searches.map((c) => c.args[1] as string).join(" | ");
    expect(queries).toMatch(/objections the customer raised/);
    expect(queries).toMatch(/sensitive or negative/);
    expect(queries).toMatch(/explicitly accepted or agreed/);
    for (const c of searches) expect(c.args[2]).toMatchObject({ budget: "high" });
  });

  it("returns the extracted landmines in order", async () => {
    const mem = await seededMemory();
    const llm = new FakeLLM({ extract: { landmines: [{ landmines: [PRICING] }] } });
    const mines = await landmines("acme", { memory: mem, llm });
    expect(mines).toEqual([PRICING]);
  });

  it("returns [] when extract yields null", async () => {
    const mem = await seededMemory();
    const mines = await landmines("acme", { memory: mem, llm: new FakeLLM() });
    expect(mines).toEqual([]);
  });
});
