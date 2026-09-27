import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ConfigError } from "../src/errors.ts";
import {
  DEFAULT_LLM_SETTINGS,
  getLlmSettings,
  redactedSettings,
  saveLlmSettings,
} from "../src/llm/settings.ts";

describe("LLM settings", () => {
  let dataDir: string;
  let previousDataDir: string | undefined;

  beforeEach(async () => {
    previousDataDir = process.env.WAADA_DATA_DIR;
    dataDir = await mkdtemp(join(tmpdir(), "waada-llm-settings-"));
    process.env.WAADA_DATA_DIR = dataDir;
  });

  afterEach(async () => {
    if (previousDataDir === undefined) delete process.env.WAADA_DATA_DIR;
    else process.env.WAADA_DATA_DIR = previousDataDir;
    await rm(dataDir, { force: true, recursive: true });
  });

  it("returns approved defaults when settings are absent", async () => {
    await expect(getLlmSettings()).resolves.toEqual(DEFAULT_LLM_SETTINGS);
  });

  it("round-trips settings including M02b's opaque ChatGPT slot", async () => {
    const settings = {
      provider: "chatgpt" as const,
      model: "experimental-model",
      credentials: { chatgpt: { refreshToken: "opaque-to-M02" } },
    };

    await saveLlmSettings(settings);

    await expect(getLlmSettings()).resolves.toEqual(settings);
  });

  it("fails safely when persisted settings have the wrong shape", async () => {
    await writeFile(join(dataDir, "llm.json"), '{"provider":"not-a-provider"}');

    await expect(getLlmSettings()).rejects.toBeInstanceOf(ConfigError);
  });

  it("redacts every configured API key", () => {
    const redacted = redactedSettings({
      provider: "openrouter",
      model: "openai/gpt-4.1-mini",
      credentials: {
        groq: { apiKey: "gsk_secret" },
        openrouter: { apiKey: "sk-or-secret", via: "key" },
        chatgpt: { refreshToken: "opaque-secret" },
      },
    });

    expect(JSON.stringify(redacted)).not.toContain("secret");
    expect(redacted.credentials.groq?.apiKey).toBe("[redacted]");
    expect(redacted.credentials.openrouter?.apiKey).toBe("[redacted]");
    expect(redacted.credentials.chatgpt?.refreshToken).toBe("[redacted]");
  });
});
