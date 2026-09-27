import { describe, expect, it } from "vitest";
import { brief } from "../src/agent/index.ts";
import { MAX_PROMPT_CHARS } from "../src/llm/budget.ts";
import type { Commitment, Landmine } from "../src/models.ts";
import { FakeLLM, FakeMemory, sampleInteractions } from "./fakes.ts";

const OPEN: Commitment = {
  text: "Send SOC 2 Type II report",
  madeBy: "Alex Rivera",
  madeTo: "Meenakshi Rao",
  date: "2026-09-02T15:30:00.000Z",
  status: "open",
  evidence: "No later interaction shows delivery",
  source: "email — Security docs follow-up",
};

const DELIVERED: Commitment = {
  text: "Send annual pricing proposal",
  madeBy: "Alex Rivera",
  madeTo: "Priya Nair",
  date: "2026-08-13T10:00:00.000Z",
  status: "delivered",
  evidence: "Sent after the original deadline",
  source: "email — Pricing proposal",
};

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

function makeLlm(markdown: string): FakeLLM {
  return new FakeLLM({
    chat: [markdown],
    extract: {
      commitments: [{ commitments: [OPEN] }],
      landmines: [{ landmines: [PRICING] }],
    },
  });
}

describe("brief", () => {
  it("returns the account, chat markdown and both structured lists", async () => {
    const b = await brief("acme", { memory: await seededMemory(), llm: makeLlm("# Acme brief") });
    expect(b.account).toBe("acme");
    expect(b.markdown).toBe("# Acme brief");
    expect(b.commitments).toEqual([OPEN]);
    expect(b.landmines).toEqual([PRICING]);
  });

  it("instructs the model to render sections in contract order", async () => {
    const llm = makeLlm("# Acme brief");
    await brief("acme", { memory: await seededMemory(), llm });
    const chatCall = llm.calls.find((c) => c.method === "chat");
    if (!chatCall) throw new Error("expected a chat call");
    const user = (chatCall.args[0] as { user: string }).user;
    const order = [
      "open commitments",
      "landmines",
      "people",
      "deal story",
      "recent changes",
      "customer words",
    ];
    const positions = order.map((s) => user.toLowerCase().indexOf(s));
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it("passes only open ledger items to the markdown prompt in ledger order", async () => {
    const llm = new FakeLLM({
      chat: ["# Acme brief"],
      extract: {
        commitments: [{ commitments: [DELIVERED, OPEN] }],
        landmines: [{ landmines: [PRICING] }],
      },
    });
    await brief("acme", { memory: await seededMemory(), llm });
    const chatCall = llm.calls.find((c) => c.method === "chat");
    if (!chatCall) throw new Error("expected a chat call");
    const user = (chatCall.args[0] as { user: string }).user;
    const openSection = user.split("\n\nLandmines:")[0] ?? "";
    expect(openSection).toContain(OPEN.text);
    expect(openSection).not.toContain(DELIVERED.text);
    expect(user).toMatch(/exactly and only the supplied items in their order/i);
  });

  it("keeps the newest recent-change evidence when context is capped", async () => {
    const mem = new FakeMemory();
    await mem.remember({
      account: "acme",
      sourceId: "file:old-timeline",
      type: "call",
      date: "2026-07-29T10:00:00.000Z",
      title: "Timeline change",
      participants: ["Alex Rivera"],
      content: `timeline changes ${"old plan ".repeat(1_000)}`,
      source: "transcript",
    });
    await mem.remember({
      account: "acme",
      sourceId: "file:new-timeline",
      type: "email",
      date: "2026-09-19T10:00:00.000Z",
      title: "Timeline change confirmed",
      participants: ["Alex Rivera"],
      content: "timeline changes Revised rollout: Q4 go-live confirmed",
      source: "eml",
    });
    const llm = makeLlm("# Acme brief");
    await brief("acme", { memory: mem, llm });
    const chatCall = llm.calls.find((c) => c.method === "chat");
    if (!chatCall) throw new Error("expected a chat call");
    const user = (chatCall.args[0] as { user: string }).user;
    expect(user).toContain("Q4 go-live confirmed");
  });

  it("recalls commitments, landmines, stakeholders and recent changes", async () => {
    const mem = await seededMemory();
    await brief("acme", { memory: mem, llm: makeLlm("# Acme brief") });
    const queries = mem.calls
      .filter((c) => c.method === "search")
      .map((c) => c.args[1] as string)
      .join(" | ")
      .toLowerCase();
    expect(queries).toMatch(/promises our team made/);
    expect(queries).toMatch(/objections the customer raised/);
    expect(queries).toMatch(/stakeholders/);
    expect(queries).toMatch(/what changed recently/);
  });

  it("runs ledger, then landmines, then the markdown chat, one after another", async () => {
    const mem = await seededMemory();
    const llm = makeLlm("# Acme brief");
    await brief("acme", { memory: mem, llm });
    // Sequential awaits make this order deterministic (parallel dispatch could
    // interleave the extracts); live serialized timing is proven by the eval.
    const order = llm.calls.map((c) =>
      c.method === "chat" ? "chat" : `extract:${(c.args[0] as { name: string }).name}`,
    );
    expect(order).toEqual(["extract:commitments", "extract:landmines", "chat"]);
  });

  it("caps huge recall context before the markdown chat", async () => {
    const mem = new FakeMemory();
    await mem.remember({
      account: "acme",
      sourceId: "file:big",
      type: "call",
      date: "2026-09-02T10:00:00.000Z",
      title: "Big call stakeholders sentiment timeline changes promises objections",
      participants: ["Alex Rivera"],
      content: `stakeholders sentiment recent changes ${"x".repeat(50_000)}`,
      source: "transcript",
    });
    const llm = makeLlm("# Acme brief");
    await brief("acme", { memory: mem, llm });
    const chatCall = llm.calls.find((c) => c.method === "chat");
    if (!chatCall) throw new Error("expected a chat call");
    const user = (chatCall.args[0] as { user: string }).user;
    expect(user).toMatch(/omitted/i);
    expect(user.length).toBeLessThanOrEqual(MAX_PROMPT_CHARS);
  });
});
