import { afterEach, describe, expect, it, vi } from "vitest";
import { ConfigError, ExternalServiceError } from "../src/errors.ts";
import { type HindsightApi, HindsightMemory, toIsoOrNull } from "../src/memory/hindsight.ts";
import { createMemory } from "../src/memory/index.ts";
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

const httpError = (status: number) =>
  Object.assign(new Error(`request failed (${status})`), { statusCode: status });
const networkError = () => new TypeError("fetch failed");

describe("HindsightMemory errors", () => {
  it("retries a network error once, then succeeds", async () => {
    const reflect = vi
      .fn<HindsightApi["reflect"]>()
      .mockRejectedValueOnce(networkError())
      .mockResolvedValueOnce({ text: "ok" });
    expect(await memoryWith(fakeApi({ reflect })).reflect("acme", "q")).toBe("ok");
    expect(reflect).toHaveBeenCalledTimes(2);
  });

  it("succeeds after two transient failures", async () => {
    const reflect = vi
      .fn<HindsightApi["reflect"]>()
      .mockRejectedValueOnce(networkError())
      .mockRejectedValueOnce(httpError(503))
      .mockResolvedValueOnce({ text: "ok" });
    expect(await memoryWith(fakeApi({ reflect })).reflect("acme", "q")).toBe("ok");
    expect(reflect).toHaveBeenCalledTimes(3);
  });

  it("waits via the injectable sleep between retries", async () => {
    const slept: number[] = [];
    const mem = new HindsightMemory({
      api: fakeApi({
        reflect: vi
          .fn<HindsightApi["reflect"]>()
          .mockRejectedValueOnce(networkError())
          .mockRejectedValueOnce(networkError())
          .mockResolvedValueOnce({ text: "ok" }),
      }),
      baseUrl: BASE_URL,
      retryDelayMs: 150,
      sleep: async (ms: number) => {
        slept.push(ms);
      },
    });
    expect(await mem.reflect("acme", "q")).toBe("ok");
    expect(slept).toEqual([150, 150]);
  });

  it("gives up after two retries on 5xx with a friendly message naming the URL", async () => {
    const recall = vi.fn<HindsightApi["recall"]>().mockRejectedValue(httpError(503));
    const err = await memoryWith(fakeApi({ recall }))
      .search("acme", "q")
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ExternalServiceError);
    expect((err as Error).message).toBe(
      "Couldn't reach Hindsight at https://hindsight.example (HTTP 503). Is the server running / is the API key right?",
    );
    expect(recall).toHaveBeenCalledTimes(3);
  });

  it("maps an unreachable server to the friendly message without an HTTP suffix", async () => {
    const retain = vi.fn<HindsightApi["retain"]>().mockRejectedValue(networkError());
    await expect(memoryWith(fakeApi({ retain })).remember(call)).rejects.toThrow(
      "Couldn't reach Hindsight at https://hindsight.example. Is the server running / is the API key right?",
    );
    expect(retain).toHaveBeenCalledTimes(3);
  });

  it("search returns no hits for a bank that doesn't exist yet (HTTP 404), without retrying", async () => {
    const recall = vi.fn<HindsightApi["recall"]>().mockRejectedValue(httpError(404));
    expect(await memoryWith(fakeApi({ recall })).search("acme", "q")).toEqual([]);
    expect(recall).toHaveBeenCalledTimes(1);
  });

  it("retries a 429 twice, then says Hindsight is busy", async () => {
    const retain = vi.fn<HindsightApi["retain"]>().mockRejectedValue(httpError(429));
    await expect(memoryWith(fakeApi({ retain })).remember(call)).rejects.toThrow(
      "Hindsight is busy (HTTP 429). Try again shortly.",
    );
    expect(retain).toHaveBeenCalledTimes(3);
  });

  it("says Hindsight rejected the request on other 4xx, naming the operation", async () => {
    const retain = vi.fn<HindsightApi["retain"]>().mockRejectedValue(httpError(422));
    await expect(memoryWith(fakeApi({ retain })).remember(call)).rejects.toThrow(
      "Hindsight rejected the retain request (HTTP 422).",
    );
    expect(retain).toHaveBeenCalledTimes(1);
  });

  it("does not retry a 4xx", async () => {
    const createBank = vi.fn<HindsightApi["createBank"]>().mockRejectedValue(httpError(400));
    await expect(memoryWith(fakeApi({ createBank })).ensureBank("acme")).rejects.toThrow(
      ExternalServiceError,
    );
    expect(createBank).toHaveBeenCalledTimes(1);
  });

  it("says the API key was rejected on 401/403, without retrying or leaking the key", async () => {
    for (const status of [401, 403]) {
      const reflect = vi
        .fn<HindsightApi["reflect"]>()
        .mockRejectedValue(
          Object.assign(new Error("Bearer hs-SECRET-KEY invalid"), { statusCode: status }),
        );
      const err = (await memoryWith(fakeApi({ reflect }))
        .reflect("acme", "q")
        .catch((e: unknown) => e)) as Error;
      expect(err).toBeInstanceOf(ExternalServiceError);
      expect(err.message).toBe(
        `Hindsight rejected the API key (HTTP ${status}). Check HINDSIGHT_API_KEY in .env.`,
      );
      expect(err.message).not.toContain("SECRET");
      expect(reflect).toHaveBeenCalledTimes(1);
    }
  });

  it("does not cache a bank whose creation failed", async () => {
    const createBank = vi
      .fn<HindsightApi["createBank"]>()
      .mockRejectedValueOnce(httpError(400))
      .mockResolvedValueOnce({});
    const mem = memoryWith(fakeApi({ createBank }));
    await expect(mem.ensureBank("acme")).rejects.toThrow(ExternalServiceError);
    expect(await mem.ensureBank("acme")).toBe("waada-acme");
    expect(createBank).toHaveBeenCalledTimes(2);
  });

  it("retries deleteBank's plain Error (no status) once", async () => {
    const deleteBank = vi
      .fn<HindsightApi["deleteBank"]>()
      .mockRejectedValueOnce(new Error("deleteBank failed: {}"))
      .mockResolvedValueOnce(undefined);
    await memoryWith(fakeApi({ deleteBank })).deleteBank("acme");
    expect(deleteBank).toHaveBeenCalledTimes(2);
  });
});

describe("createMemory", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("throws ConfigError naming HINDSIGHT_BASE_URL when it is unset", () => {
    vi.stubEnv("HINDSIGHT_BASE_URL", ""); // real env wins over .env; empty counts as unset
    expect(() => createMemory()).toThrow(ConfigError);
    expect(() => createMemory()).toThrow(/HINDSIGHT_BASE_URL/);
  });

  it("builds a Memory without touching the network, with or without an API key", () => {
    vi.stubEnv("HINDSIGHT_BASE_URL", "http://localhost:8888");
    vi.stubEnv("HINDSIGHT_API_KEY", "");
    const local = createMemory();
    expect(typeof local.search).toBe("function");
    vi.stubEnv("HINDSIGHT_API_KEY", "hs-test");
    expect(typeof createMemory().reflect).toBe("function");
  });
});
