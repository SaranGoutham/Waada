import { describe, expect, it } from "vitest";
import { brief } from "../src/agent/index.ts";
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
});
