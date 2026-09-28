import { describe, expect, it } from "vitest";
import { commitmentLedger } from "../src/agent/index.ts";
import type { Commitment } from "../src/models.ts";
import { FakeLLM, FakeMemory, sampleInteractions } from "./fakes.ts";

const DELIVERED: Commitment = {
  text: "Send annual pricing proposal",
  madeBy: "Alex Rivera",
  madeTo: "Priya Nair",
  date: "2026-08-13T10:00:00.000Z",
  status: "delivered",
  evidence: "Delivered Aug 15 proposal email",
  source: "email — Pricing proposal",
};

const OPEN: Commitment = {
  text: "Send SOC 2 Type II report",
  madeBy: "Alex Rivera",
  madeTo: "Meenakshi Rao",
  date: "2026-09-02T15:30:00.000Z",
  status: "open",
  evidence: "No later interaction shows delivery",
  source: "email — Security docs follow-up",
};

const OLDER_OPEN: Commitment = {
  ...OPEN,
  text: "Send implementation plan",
  date: "2026-08-01T10:00:00.000Z",
};

const UNDATED_OPEN: Commitment = {
  ...OPEN,
  text: "Send deployment checklist",
  date: null,
};

const UNCLEAR: Commitment = {
  text: "Loop in the onboarding lead",
  madeBy: "Alex Rivera",
  madeTo: "Priya Nair",
  date: "2026-09-18T10:00:00.000Z",
  status: "unclear",
  evidence: "Conflicting later traces",
  source: "call — Go-live shift",
};

async function seededMemory(): Promise<FakeMemory> {
  const mem = new FakeMemory();
  for (const i of sampleInteractions()) await mem.remember(i);
  return mem;
}

function searchCalls(mem: FakeMemory): { query: string; opts: unknown }[] {
  return mem.calls
    .filter((c) => c.method === "search")
    .map((c) => ({ query: c.args[1] as string, opts: c.args[2] }));
}

describe("commitmentLedger", () => {
  it("recalls the four commitment query sets with a high budget", async () => {
    const mem = await seededMemory();
    const llm = new FakeLLM({ extract: { commitments: [{ commitments: [] }] } });
    await commitmentLedger("acme", { memory: mem, llm });
    const queries = searchCalls(mem).map((c) => c.query);
    expect(queries).toHaveLength(4);
    expect(queries.join(" ").toLowerCase()).toMatch(/promises our team made/);
    for (const c of searchCalls(mem)) expect(c.opts).toMatchObject({ budget: "high" });
  });

  it("sorts open newest-first with undated items last, then unclear, then delivered", async () => {
    const mem = await seededMemory();
    const llm = new FakeLLM({
      extract: {
        commitments: [{ commitments: [DELIVERED, UNCLEAR, UNDATED_OPEN, OLDER_OPEN, OPEN] }],
      },
    });
    const ledger = await commitmentLedger("acme", { memory: mem, llm });
    expect(ledger.map((c) => c.text)).toEqual([
      OPEN.text,
      OLDER_OPEN.text,
      UNDATED_OPEN.text,
      UNCLEAR.text,
      DELIVERED.text,
    ]);
  });

  it("dedupes recalled hits by text before asking the model", async () => {
    const mem = await seededMemory();
    const first = sampleInteractions()[0];
    if (!first) throw new Error("sampleInteractions is empty");
    const dup = {
      ...first,
      sourceId: "file:duplicate00000001",
      date: "2026-09-03T10:00:00.000Z",
    };
    await mem.remember(dup);
    const llm = new FakeLLM({ extract: { commitments: [{ commitments: [] }] } });
    await commitmentLedger("acme", { memory: mem, llm });
    const extractCall = llm.calls.find((c) => c.method === "extract");
    if (!extractCall) throw new Error("expected an extract call");
    const user = (extractCall.args[0] as { user: string }).user;
    const occurrences = user.split("we will send the SOC 2 Type II report").length - 1;
    expect(occurrences).toBe(1);
  });

  it("returns [] when extract yields null", async () => {
    const mem = await seededMemory();
    const ledger = await commitmentLedger("acme", { memory: mem, llm: new FakeLLM() });
    expect(ledger).toEqual([]);
  });

  it("gives the extractor the v3 commitment and delivery rules", async () => {
    const mem = await seededMemory();
    const llm = new FakeLLM({ extract: { commitments: [{ commitments: [] }] } });
    await commitmentLedger("acme", { memory: mem, llm });
    const extractCall = llm.calls.find((c) => c.method === "extract");
    if (!extractCall) throw new Error("expected an extract call");
    const system = (extractCall.args[0] as { system: string }).system;
    expect(system).toMatch(/even if.*late/i);
    expect(system).toMatch(/ongoing habits, processes, and service levels.*not commitments/i);
    expect(system).toMatch(/merge promises for the same deliverable/i);
    expect(system).toMatch(/sent, shared, attached, returned/i);
    expect(system).toMatch(/no later interaction mentions it/i);
  });

  it("uses deterministic extraction for the ledger", async () => {
    const mem = await seededMemory();
    const llm = new FakeLLM({ extract: { commitments: [{ commitments: [] }] } });
    await commitmentLedger("acme", { memory: mem, llm });
    const extractCall = llm.calls.find((c) => c.method === "extract");
    if (!extractCall) throw new Error("expected an extract call");
    expect((extractCall.args[0] as { temperature: number }).temperature).toBe(0);
  });
});
