// Baselines + compare (M05, card 002): the honest competitor stand-ins.
// baselineCrm and baselineSummary must never touch memory; compare isolates
// failures per column instead of failing the whole run.
import { describe, expect, it } from "vitest";
import { SUMMARY_BUDGET_CHARS, truncateForBudget } from "../src/agent/baselines.ts";
import { baselineCrm, baselineSummary, compare } from "../src/agent/index.ts";
import { BRIEF_SYSTEM } from "../src/agent/prompts.ts";
import type { Memory } from "../src/memory/index.ts";
import type { MemoryHit } from "../src/models.ts";
import { FakeLLM, FakeMemory } from "./fakes.ts";

const TRANSCRIPT_METADATA = [
  {
    date: "2026-08-20T10:00:00.000Z",
    title: "Call #4 — pilot scoping",
    participants: ["Priya Nair", "Meenakshi Rao", "Alex Rivera"],
    type: "call",
  },
  {
    date: "2026-09-11T10:00:00.000Z",
    title: "Call #7 — commercial terms",
    participants: ["Priya Nair", "Alex Rivera"],
    type: "call",
  },
];

/** Chat replies plus the two headerless transcripts' metadata, like ingest-seed.test.ts queues. */
function seedLlm(chat: string[]): FakeLLM {
  return new FakeLLM({ chat, extract: { "transcript-metadata": TRANSCRIPT_METADATA } });
}

function chatCall(llm: FakeLLM): { system: string; user: string } {
  const call = llm.calls.find((c) => c.method === "chat");
  if (!call) throw new Error("expected a chat call");
  return call.args[0] as { system: string; user: string };
}

/** A Memory whose search always fails, to make the Waada leg of compare fail deterministically. */
class ThrowingMemory implements Memory {
  async ensureBank(): Promise<string> {
    return "waada-acme";
  }
  async remember(): Promise<void> {}
  async search(): Promise<MemoryHit[]> {
    throw new Error("boom: memory unavailable");
  }
  async reflect(): Promise<string> {
    return "";
  }
  async deleteBank(): Promise<void> {}
}

describe("baselineCrm", () => {
  it("never calls memory", async () => {
    const mem = new FakeMemory();
    await baselineCrm("acme", { memory: mem, llm: new FakeLLM({ chat: ["# CRM brief"] }) });
    expect(mem.calls).toEqual([]);
  });

  it("sends only CRM fields to the model, with the brief system prompt", async () => {
    const llm = new FakeLLM({ chat: ["# CRM brief"] });
    await baselineCrm("acme", { memory: new FakeMemory(), llm });
    const { system, user } = chatCall(llm);
    expect(system).toBe(BRIEF_SYSTEM);
    expect(user).toContain("86000"); // amount_usd from seed/acme/crm.json
    expect(user).toContain("Evaluation"); // stage
    expect(user).not.toContain("SOC 2"); // no interaction content leaks in
    expect(user).not.toContain("Meenakshi");
  });
});

describe("baselineSummary", () => {
  it("never calls memory", async () => {
    const mem = new FakeMemory();
    await baselineSummary("acme", { memory: mem, llm: seedLlm(["# summary"]) });
    expect(mem.calls).toEqual([]);
  });

  it("parses the seed folder and keeps the most recent raw text within budget", async () => {
    const llm = seedLlm(["# summary"]);
    const markdown = await baselineSummary("acme", { memory: new FakeMemory(), llm });
    expect(markdown).toBe("# summary");
    const { system, user } = chatCall(llm);
    expect(system).toBe(BRIEF_SYSTEM);
    // Acme's full text (~30k chars) exceeds the free-tier budget, so the oldest
    // history is cut and the omission is labelled; the recent tail stays ordered.
    expect(user).toMatch(/omitted/i);
    expect(user.length).toBeLessThanOrEqual(SUMMARY_BUDGET_CHARS + 500);
    const late = user.indexOf("tomorrow is my last day"); // email-0925, Sep 25
    expect(late).toBeGreaterThanOrEqual(0);
  });
});

describe("truncateForBudget", () => {
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

describe("compare", () => {
  it("returns crm, summary and waada columns", async () => {
    const mem = new FakeMemory();
    const llm = new FakeLLM({
      chat: ["# same markdown", "# same markdown", "# same markdown"],
      extract: {
        commitments: [{ commitments: [] }],
        landmines: [{ landmines: [] }],
        "transcript-metadata": TRANSCRIPT_METADATA,
      },
    });
    const columns = await compare("acme", { memory: mem, llm });
    expect(columns.crm).toBe("# same markdown");
    expect(columns.summary).toBe("# same markdown");
    expect(columns.waada).toBe("# same markdown");
    expect(mem.calls.some((c) => c.method === "search")).toBe(true); // the Waada leg ran
  });

  it("returns the error message in the failing column instead of throwing", async () => {
    const llm = new FakeLLM({ chat: ["crm column", "summary column"] });
    const columns = await compare("acme", { memory: new ThrowingMemory(), llm });
    expect(columns.crm).toBe("crm column");
    expect(columns.summary).toBe("summary column");
    expect(columns.waada).toBe("boom: memory unavailable");
  });
});
