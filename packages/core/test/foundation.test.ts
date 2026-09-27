import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { bankIdFor, findProjectRoot, getEnv, requireEnv, slugify } from "../src/config.ts";
import { ConfigError, ExternalServiceError, WaadaError } from "../src/errors.ts";
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
