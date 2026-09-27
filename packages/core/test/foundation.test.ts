import { existsSync } from "node:fs";
import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type * as Pkg from "@waada/core";
import type * as PkgTesting from "@waada/core/testing";
import { afterEach, beforeEach, describe, expect, expectTypeOf, it, vi } from "vitest";
import { z } from "zod";
import { Account, listAccounts, upsertAccount } from "../src/accounts.ts";
import { bankIdFor, findProjectRoot, getEnv, requireEnv, slugify } from "../src/config.ts";
import { ConfigError, ExternalServiceError, WaadaError } from "../src/errors.ts";
import { LlmSettings } from "../src/llm/index.ts";
import { createLogger, log } from "../src/log.ts";
import {
  Answer,
  Brief,
  Commitment,
  FileInput,
  IngestReport,
  Interaction,
  Landmine,
  MemoryHit,
} from "../src/models.ts";
import { readJson, writeJson } from "../src/store.ts";
import { FakeLLM, FakeMemory, sampleInteractions } from "./fakes.ts";

const validInteraction = {
  account: "acme",
  sourceId: "<abc@mail.acme.com>",
  type: "email",
  date: "2026-09-02T14:00:00Z",
  title: "Security docs follow-up",
  participants: ["dana@acme.com", "sam@waada.dev"],
  content: "We will send the SOC 2 Type II report by Friday.",
  source: "eml",
} as const;

describe("models", () => {
  it("accepts a valid Interaction", () => {
    expect(Interaction.parse(validInteraction)).toEqual(validInteraction);
  });

  it("rejects an Interaction with a bad type, non-ISO date, or missing sourceId", () => {
    expect(Interaction.safeParse({ ...validInteraction, type: "fax" }).success).toBe(false);
    expect(Interaction.safeParse({ ...validInteraction, date: "2 Sep 2026" }).success).toBe(false);
    expect(Interaction.safeParse({ ...validInteraction, source: "pdf" }).success).toBe(false);
    const { sourceId: _omit, ...noSourceId } = validInteraction;
    expect(Interaction.safeParse(noSourceId).success).toBe(false);
  });

  it("validates Commitment status and nullable dates", () => {
    const c = {
      text: "Send SOC 2 Type II report",
      madeBy: "Sam",
      madeTo: "Dana",
      date: null,
      status: "open",
      evidence: "No later email contains the report",
      source: "Call #4 — Sep 2",
    };
    expect(Commitment.parse(c)).toEqual(c);
    expect(Commitment.safeParse({ ...c, status: "done" }).success).toBe(false);
  });

  it("parses Landmine, MemoryHit, Answer, Brief and IngestReport", () => {
    const landmine = {
      topic: "Monthly pricing",
      whatHappened: "Buyer pushed for monthly billing",
      resolution: "Annual billing + 8% discount accepted",
      date: "2026-08-20T10:00:00Z",
      guidance: "Do NOT re-open",
      source: "Call #2",
    };
    expect(Landmine.parse(landmine)).toEqual(landmine);
    expect(MemoryHit.parse({ text: "t", date: null, context: null, documentId: null }).text).toBe(
      "t",
    );
    expect(Answer.parse({ text: "a", citations: ["Call #2"] }).citations).toEqual(["Call #2"]);
    expect(
      Brief.parse({ account: "acme", markdown: "# Acme", commitments: [], landmines: [landmine] })
        .landmines,
    ).toHaveLength(1);
    expect(IngestReport.safeParse({ added: 1.5, skipped: 0, errors: [] }).success).toBe(false);
  });

  it("FileInput accepts Uint8Array data and rejects strings", () => {
    expect(FileInput.safeParse({ name: "a.eml", data: new Uint8Array([1, 2]) }).success).toBe(true);
    expect(FileInput.safeParse({ name: "a.eml", data: "abc" }).success).toBe(false);
  });
});

describe("errors", () => {
  it("subclasses WaadaError and keeps a readable name", () => {
    const e = new ConfigError("Missing HINDSIGHT_BASE_URL");
    expect(e).toBeInstanceOf(WaadaError);
    expect(e).toBeInstanceOf(Error);
    expect(e.name).toBe("ConfigError");
    expect(e.message).toBe("Missing HINDSIGHT_BASE_URL");
    expect(new ExternalServiceError("x")).toBeInstanceOf(WaadaError);
    expect(new WaadaError("x").name).toBe("WaadaError");
  });
});

describe("config", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("bankIdFor slugifies account names", () => {
    expect(bankIdFor("Acme Corp")).toBe("waada-acme-corp");
    expect(bankIdFor("acme")).toBe("waada-acme");
    expect(bankIdFor("  ACME--corp!! ")).toBe("waada-acme-corp");
    expect(bankIdFor("Café Säo 2")).toBe("waada-cafe-sao-2");
    expect(slugify("Globex, Inc.")).toBe("globex-inc");
  });

  it("bankIdFor rejects names without letters or digits", () => {
    expect(() => bankIdFor("!!!")).toThrow(WaadaError);
    expect(() => bankIdFor("")).toThrow(WaadaError);
  });

  it("requireEnv lists every missing variable", () => {
    vi.stubEnv("WAADA_T_PRESENT", "yes");
    vi.stubEnv("WAADA_T_EMPTY", "");
    expect(() => requireEnv("WAADA_T_PRESENT")).not.toThrow();
    let err: unknown;
    try {
      requireEnv("WAADA_T_PRESENT", "WAADA_T_MISSING", "WAADA_T_EMPTY");
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(ConfigError);
    expect((err as Error).message).toContain("WAADA_T_MISSING");
    expect((err as Error).message).toContain("WAADA_T_EMPTY");
    expect((err as Error).message).not.toContain("WAADA_T_PRESENT");
  });

  it("getEnv resolves dataDir against the project root", () => {
    const root = findProjectRoot();
    expect(existsSync(join(root, "pnpm-workspace.yaml"))).toBe(true);
    vi.stubEnv("WAADA_DATA_DIR", "");
    expect(getEnv().dataDir).toBe(join(root, ".waada"));
    vi.stubEnv("WAADA_DATA_DIR", "some/rel");
    expect(getEnv().dataDir).toBe(join(root, "some", "rel"));
    const abs = join(tmpdir(), "waada-abs");
    vi.stubEnv("WAADA_DATA_DIR", abs);
    expect(getEnv().dataDir).toBe(abs);
  });

  it("getEnv maps env vars to fields", () => {
    vi.stubEnv("HINDSIGHT_BASE_URL", "http://localhost:8888");
    vi.stubEnv("SLACK_BOT_TOKEN", "");
    const env = getEnv();
    expect(env.hindsightBaseUrl).toBe("http://localhost:8888");
    expect(env.slackBotToken).toBeUndefined();
  });
});

describe("log", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("writes to stderr only, redacts secrets, and respects the level", () => {
    const err = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    const out = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    vi.stubEnv("WAADA_LOG_LEVEL", "info");
    createLogger("memory").info("bank ready", { bank: "waada-acme", apiKey: "sk-secret" });
    log.debug("hidden");
    expect(out).not.toHaveBeenCalled();
    expect(err).toHaveBeenCalledTimes(1);
    const line = String(err.mock.calls[0]?.[0]);
    expect(line).toContain("INFO");
    expect(line).toContain("[memory]");
    expect(line).toContain("waada-acme");
    expect(line).not.toContain("sk-secret");
    expect(line).toContain("[redacted]");
    vi.stubEnv("WAADA_LOG_LEVEL", "debug");
    log.debug("shown");
    expect(err).toHaveBeenCalledTimes(2);
  });
});

describe("store", () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "waada-store-"));
    vi.stubEnv("WAADA_DATA_DIR", dir);
  });
  afterEach(async () => {
    vi.unstubAllEnvs();
    await rm(dir, { recursive: true, force: true });
  });

  const Sync = z.object({ cursor: z.string(), count: z.number() });

  it("returns the fallback when the file is missing", async () => {
    expect(await readJson("nope.json", Sync, { cursor: "", count: 0 })).toEqual({
      cursor: "",
      count: 0,
    });
  });

  it("round-trips through a nested path and leaves no temp files", async () => {
    await writeJson("sync/slack.json", { cursor: "abc", count: 3 });
    await writeJson("sync/slack.json", { cursor: "def", count: 4 });
    expect(await readJson("sync/slack.json", Sync, { cursor: "", count: 0 })).toEqual({
      cursor: "def",
      count: 4,
    });
    expect(await readdir(join(dir, "sync"))).toEqual(["slack.json"]);
  });

  it("throws ConfigError naming the file for invalid JSON or schema mismatch", async () => {
    await writeFile(join(dir, "broken.json"), "{not json");
    await expect(readJson("broken.json", Sync, { cursor: "", count: 0 })).rejects.toThrow(
      ConfigError,
    );
    await expect(readJson("broken.json", Sync, { cursor: "", count: 0 })).rejects.toThrow(
      /broken\.json/,
    );
    await writeJson("wrong.json", { cursor: 1 });
    await expect(readJson("wrong.json", Sync, { cursor: "", count: 0 })).rejects.toThrow(
      ConfigError,
    );
  });

  it("rejects paths outside the data dir", async () => {
    await expect(writeJson("../escape.json", {})).rejects.toThrow(WaadaError);
    await expect(readJson(join(dir, "abs.json"), Sync, { cursor: "", count: 0 })).rejects.toThrow(
      WaadaError,
    );
  });
});

describe("accounts", () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "waada-accounts-"));
    vi.stubEnv("WAADA_DATA_DIR", dir);
  });
  afterEach(async () => {
    vi.unstubAllEnvs();
    await rm(dir, { recursive: true, force: true });
  });

  it("starts empty, upserts, and lists", async () => {
    expect(await listAccounts()).toEqual([]);
    const a = await upsertAccount({ name: "Acme Corp" });
    expect(a.slug).toBe("acme-corp");
    expect(a.name).toBe("Acme Corp");
    expect(Account.parse(a)).toEqual(a);
    expect(await listAccounts()).toEqual([a]);
  });

  it("updates the name of an existing slug and keeps createdAt", async () => {
    const first = await upsertAccount({ name: "Acme" });
    const second = await upsertAccount({ name: "ACME Inc", slug: "acme" });
    expect(second).toEqual({ ...first, name: "ACME Inc" });
    expect(await listAccounts()).toHaveLength(1);
  });

  it("honours an explicit slug and keeps concurrent upserts", async () => {
    await Promise.all([
      upsertAccount({ name: "Globex", slug: "globex-eu" }),
      upsertAccount({ name: "Initech" }),
    ]);
    expect((await listAccounts()).map((a) => a.slug).sort()).toEqual(["globex-eu", "initech"]);
  });
});

describe("public index", () => {
  it("exports the contract names, with stubs for unbuilt modules", async () => {
    const core = await import("../src/index.ts");
    for (const name of [
      "Interaction",
      "createMemory",
      "createLLM",
      "LlmSettings",
      "ingest",
      "parseFiles",
      "brief",
      "commitmentLedger",
      "compare",
      "getEnv",
      "readJson",
      "upsertAccount",
      "log",
    ]) {
      expect(core, name).toHaveProperty(name);
    }
    await expect(core.createLLM()).rejects.toThrow("not implemented: llm");
    await expect(core.ingest([])).rejects.toThrow("not implemented: ingest");
    await expect(core.brief("acme")).rejects.toThrow("not implemented: agent");
  });

  it("LlmSettings accepts the default Groq settings", () => {
    const s = {
      provider: "groq",
      model: "openai/gpt-oss-120b",
      fallbackModel: "qwen/qwen3-32b",
      credentials: { groq: { apiKey: "gsk_x" }, ollama: { baseUrl: "http://localhost:11434/v1" } },
    };
    expect(LlmSettings.parse(s)).toEqual(s);
  });

  it("type-checks when imported by package name (verified by pnpm check)", () => {
    expectTypeOf<Pkg.Interaction>().toEqualTypeOf<Interaction>();
    expectTypeOf<typeof Pkg.createMemory>().returns.toEqualTypeOf<Pkg.Memory>();
    expectTypeOf<typeof Pkg.createLLM>().returns.toEqualTypeOf<Promise<Pkg.LLM>>();
    expectTypeOf<typeof Pkg.ingest>().returns.toEqualTypeOf<Promise<Pkg.IngestReport>>();
    expectTypeOf<typeof Pkg.brief>().returns.toEqualTypeOf<Promise<Pkg.Brief>>();
    expectTypeOf<PkgTesting.FakeMemory>().toMatchTypeOf<Pkg.Memory>();
    expectTypeOf<PkgTesting.FakeLLM>().toMatchTypeOf<Pkg.LLM>();
  });
});

describe("fakes", () => {
  it("sampleInteractions returns 3 valid Interactions for acme", () => {
    const items = sampleInteractions();
    expect(items).toHaveLength(3);
    for (const i of items) {
      expect(Interaction.parse(i)).toEqual(i);
      expect(i.account).toBe("acme");
    }
    expect(new Set(items.map((i) => i.sourceId)).size).toBe(3);
  });

  it("FakeMemory stores per account and ranks search hits by word overlap", async () => {
    const mem = new FakeMemory();
    expect(await mem.ensureBank("acme")).toBe("waada-acme");
    for (const i of sampleInteractions()) await mem.remember(i);
    const [email] = sampleInteractions() as [Interaction];
    await mem.remember({ ...email, account: "globex", sourceId: "g1" });

    const hits = await mem.search("acme", "When is the SOC 2 report due?");
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0]?.documentId).toBe("<soc2-followup@acme.example>");
    expect(hits[0]?.context).toBe("email — Security docs follow-up");
    expect(hits.every((h) => MemoryHit.parse(h))).toBe(true);
    expect(hits.some((h) => h.documentId === "g1")).toBe(false);
    expect(await mem.search("acme", "zebra giraffe")).toEqual([]);
    expect(await mem.search("acme", "pricing SOC report billing", { maxResults: 1 })).toHaveLength(
      1,
    );
  });

  it("FakeMemory replaces by sourceId, deletes banks, reflects, and records calls", async () => {
    const mem = new FakeMemory({ reflectAnswer: "They care about security." });
    const [first] = sampleInteractions() as [Interaction];
    await mem.remember(first);
    await mem.remember({ ...first, content: "Updated: zebra" });
    expect(await mem.search("acme", "zebra")).toHaveLength(1);
    expect(await mem.reflect("acme", "patterns?")).toBe("They care about security.");
    expect(await new FakeMemory().reflect("acme", "x")).toBe(FakeMemory.DEFAULT_REFLECTION);
    await mem.deleteBank("acme");
    expect(await mem.search("acme", "zebra")).toEqual([]);
    expect(mem.calls.map((c) => c.method)).toEqual([
      "remember",
      "remember",
      "search",
      "reflect",
      "deleteBank",
      "search",
    ]);
    expect(mem.calls[2]?.args).toEqual(["acme", "zebra", undefined]);
  });

  it("FakeLLM returns queued chat replies in order, then throws", async () => {
    const llm = new FakeLLM({ chat: ["one", "two"] });
    expect(await llm.chat({ system: "s", user: "u" })).toBe("one");
    expect(await llm.chat({ system: "s", user: "u2" })).toBe("two");
    await expect(llm.chat({ system: "s", user: "u3" })).rejects.toThrow(/no chat reply queued/);
    expect(llm.calls[1]).toEqual({ method: "chat", args: [{ system: "s", user: "u2" }] });
  });

  it("FakeLLM.extract returns queued values by name, validated, else null", async () => {
    const Item = z.object({ text: z.string() });
    const llm = new FakeLLM({ extract: { ledger: [{ text: "ok" }, { wrong: 1 }] } });
    const args = { system: "s", user: "u", schema: Item, name: "ledger", description: "d" };
    expect(await llm.extract(args)).toEqual({ text: "ok" });
    expect(await llm.extract(args)).toBeNull(); // fails schema
    expect(await llm.extract(args)).toBeNull(); // queue empty
    expect(await llm.extract({ ...args, name: "other" })).toBeNull();
    expect(llm.calls.filter((c) => c.method === "extract")).toHaveLength(4);
  });

  it("FakeLLM.transcribe returns the configured text, or throws when none", async () => {
    const llm = new FakeLLM({ transcribe: "hello from the call" });
    expect(await llm.transcribe(new Uint8Array([1]), "call.mp3")).toBe("hello from the call");
    expect(await llm.transcribe(new Uint8Array([2]), "call2.mp3")).toBe("hello from the call");
    await expect(new FakeLLM().transcribe(new Uint8Array(), "a.mp3")).rejects.toThrow(
      /no transcription/,
    );
  });
});
