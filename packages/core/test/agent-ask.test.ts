import { describe, expect, it } from "vitest";
import { ask } from "../src/agent/index.ts";
import { MAX_PROMPT_CHARS } from "../src/llm/budget.ts";
import type { Memory } from "../src/memory/index.ts";
import type { MemoryHit } from "../src/models.ts";
import { FakeLLM, FakeMemory, sampleInteractions } from "./fakes.ts";

async function seededMemory(): Promise<FakeMemory> {
  const mem = new FakeMemory();
  for (const i of sampleInteractions()) await mem.remember(i);
  return mem;
}

describe("ask", () => {
  it("issues one high-budget recall with the question", async () => {
    const mem = await seededMemory();
    const llm = new FakeLLM({ chat: ["Annual billing + 8% was accepted."] });
    await ask("acme", "What pricing did they agree to?", { memory: mem, llm });
    const searches = mem.calls.filter((c) => c.method === "search");
    expect(searches).toHaveLength(1);
    expect(searches[0]?.args[1]).toBe("What pricing did they agree to?");
    expect(searches[0]?.args[2]).toMatchObject({ budget: "high" });
  });

  it("answers from memories with citations", async () => {
    const mem = await seededMemory();
    const llm = new FakeLLM({ chat: ["Annual billing + 8% was accepted."] });
    const answer = await ask("acme", "What pricing did they agree to?", { memory: mem, llm });
    expect(answer.text).toBe("Annual billing + 8% was accepted.");
    expect(answer.citations.length).toBeGreaterThan(0);
    const chatCall = llm.calls.find((c) => c.method === "chat");
    if (!chatCall) throw new Error("expected a chat call");
    const chatUser = (chatCall.args[0] as { user: string }).user;
    expect(chatUser).toMatch(/answer only from/i);
  });

  it("caps recall evidence within the full prompt budget without displacing top hits", async () => {
    const hits: MemoryHit[] = [
      {
        text: `most relevant evidence ${"a".repeat(MAX_PROMPT_CHARS)}`,
        date: "2026-09-02T15:30:00.000Z",
        context: "email — top hit",
        documentId: "top",
      },
      {
        text: "least relevant evidence",
        date: "2026-08-20T10:00:00.000Z",
        context: "call — later hit",
        documentId: "later",
      },
    ];
    const memory: Memory = {
      ensureBank: async () => "unused",
      remember: async () => {},
      search: async () => hits,
      reflect: async () => "unused",
      deleteBank: async () => {},
    };
    const llm = new FakeLLM({ chat: ["Answer from the most relevant evidence."] });

    await ask("acme", "What changed?", { memory, llm });

    const chatCall = llm.calls.find((call) => call.method === "chat");
    if (!chatCall) throw new Error("expected a chat call");
    const prompt = chatCall.args[0] as { system: string; user: string };
    expect(prompt.system.length + prompt.user.length).toBeLessThanOrEqual(MAX_PROMPT_CHARS);
    expect(prompt.user).toContain("most relevant evidence");
    expect(prompt.user).not.toContain("least relevant evidence");
  });

  it("says not in memory instead of guessing when nothing is recalled", async () => {
    const mem = new FakeMemory();
    const llm = new FakeLLM({ chat: ["this reply must never be used"] });
    const answer = await ask("acme", "What is the mascot's name?", { memory: mem, llm });
    expect(answer.text).toMatch(/not in memory/i);
    expect(answer.citations).toEqual([]);
    expect(llm.calls.some((c) => c.method === "chat")).toBe(false);
  });
});
