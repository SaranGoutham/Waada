import { describe, expect, it, vi } from "vitest";
import { type HindsightApi, HindsightMemory, toIsoOrNull } from "../src/memory/hindsight.ts";
import { type Interaction, MemoryHit } from "../src/models.ts";

const BASE_URL = "https://hindsight.example";

function fakeApi(overrides: Partial<HindsightApi> = {}) {
  return {
    createBank: vi.fn<HindsightApi["createBank"]>(async () => ({})),
    retain: vi.fn<HindsightApi["retain"]>(async () => ({})),
    recall: vi.fn<HindsightApi["recall"]>(async () => ({ results: [] })),
    reflect: vi.fn<HindsightApi["reflect"]>(async () => ({ text: "They care about security." })),
    deleteBank: vi.fn<HindsightApi["deleteBank"]>(async () => {}),
    ...overrides,
  };
}

function memoryWith(api: HindsightApi) {
  return new HindsightMemory({ api, baseUrl: BASE_URL, retryDelayMs: 0 });
}

const call: Interaction = {
  account: "acme",
  sourceId: "file:0123456789abcdef",
  type: "call",
  date: "2026-08-12T15:00:00.000Z",
  title: "Call #2 — pricing discussion",
  participants: ["Dana Reyes", "Sam Lee"],
  content: "Dana said she will champion the security review.",
  source: "transcript",
};

describe("toIsoOrNull", () => {
  it("normalises offsets to UTC Z and rejects junk", () => {
    expect(toIsoOrNull("2026-08-12T15:00:00+00:00")).toBe("2026-08-12T15:00:00.000Z");
    expect(toIsoOrNull("2026-08-12T17:00:00+02:00")).toBe("2026-08-12T15:00:00.000Z");
    expect(toIsoOrNull("not a date")).toBeNull();
    expect(toIsoOrNull("")).toBeNull();
    expect(toIsoOrNull(null)).toBeNull();
    expect(toIsoOrNull(undefined)).toBeNull();
  });
});

describe("HindsightMemory", () => {
  it("ensureBank creates the bank with both missions, caches it, and returns its id", async () => {
    const api = fakeApi();
    const mem = memoryWith(api);
    expect(await mem.ensureBank("Acme Corp")).toBe("waada-acme-corp");
    expect(await mem.ensureBank("Acme Corp")).toBe("waada-acme-corp");
    expect(api.createBank).toHaveBeenCalledTimes(1);
    const [bankId, opts] = vi.mocked(api.createBank).mock.calls[0] ?? [];
    expect(bankId).toBe("waada-acme-corp");
    expect(opts?.reflectMission).toMatch(/^You are the continuity memory for a B2B sales deal\./);
    expect(opts?.retainMission).toBe(opts?.reflectMission);
  });

  it("remember ensures the bank, then retains synchronously with mapped fields", async () => {
    const api = fakeApi();
    await memoryWith(api).remember(call);
    expect(api.createBank).toHaveBeenCalledTimes(1);
    expect(api.retain).toHaveBeenCalledWith("waada-acme", call.content, {
      context: "call — Call #2 — pricing discussion",
      timestamp: "2026-08-12T15:00:00.000Z",
      documentId: "file:0123456789abcdef",
      metadata: {
        type: "call",
        participants: "Dana Reyes, Sam Lee",
        account: "acme",
        source: "transcript",
      },
      async: false,
    });
  });

  it("search maps recall results to MemoryHits and passes the budget", async () => {
    const api = fakeApi({
      recall: vi.fn<HindsightApi["recall"]>(async () => ({
        results: [
          {
            text: "Dana Reyes is the champion",
            context: "call — Call #2",
            occurred_start: "2026-08-12T15:00:00+00:00",
            mentioned_at: "2026-09-01T00:00:00+00:00",
            document_id: "file:0123456789abcdef",
          },
          { text: "Mentioned only", mentioned_at: "2026-08-13T09:30:00Z" },
          { text: "No date", occurred_start: null, context: null, document_id: null },
          { text: "Bad date", occurred_start: "someday" },
        ],
      })),
    });
    const hits = await memoryWith(api).search("acme", "Who is the champion?", { budget: "high" });
    expect(api.recall).toHaveBeenCalledWith("waada-acme", "Who is the champion?", {
      budget: "high",
    });
    expect(hits).toEqual([
      {
        text: "Dana Reyes is the champion",
        date: "2026-08-12T15:00:00.000Z",
        context: "call — Call #2",
        documentId: "file:0123456789abcdef",
      },
      { text: "Mentioned only", date: "2026-08-13T09:30:00.000Z", context: null, documentId: null },
      { text: "No date", date: null, context: null, documentId: null },
      { text: "Bad date", date: null, context: null, documentId: null },
    ]);
    for (const hit of hits) expect(() => MemoryHit.parse(hit)).not.toThrow();
  });

  it("search defaults the budget to mid and applies maxResults", async () => {
    const api = fakeApi({
      recall: vi.fn<HindsightApi["recall"]>(async () => ({
        results: [{ text: "a" }, { text: "b" }, { text: "c" }],
      })),
    });
    const hits = await memoryWith(api).search("acme", "q", { maxResults: 2 });
    expect(api.recall).toHaveBeenCalledWith("waada-acme", "q", { budget: "mid" });
    expect(hits.map((h) => h.text)).toEqual(["a", "b"]);
  });

  it("reflect returns the answer text", async () => {
    const api = fakeApi();
    expect(await memoryWith(api).reflect("acme", "What matters to them?")).toBe(
      "They care about security.",
    );
    expect(api.reflect).toHaveBeenCalledWith("waada-acme", "What matters to them?");
  });

  it("deleteBank deletes and forgets the cached bank", async () => {
    const api = fakeApi();
    const mem = memoryWith(api);
    await mem.ensureBank("acme");
    await mem.deleteBank("acme");
    expect(api.deleteBank).toHaveBeenCalledWith("waada-acme");
    await mem.ensureBank("acme");
    expect(api.createBank).toHaveBeenCalledTimes(2);
  });
});
