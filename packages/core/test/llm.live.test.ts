import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { createLLM } from "../src/llm/index.ts";
import { saveLlmSettings } from "../src/llm/settings.ts";

const groqApiKey = process.env.GROQ_API_KEY ?? "";
const live = groqApiKey ? describe : describe.skip;

live("Groq live LLM", () => {
  let dataDir: string;

  beforeEach(async () => {
    dataDir = await mkdtemp(join(tmpdir(), "waada-llm-live-"));
    process.env.WAADA_DATA_DIR = dataDir;
    await saveLlmSettings({
      provider: "groq",
      model: "openai/gpt-oss-120b",
      credentials: { groq: { apiKey: groqApiKey } },
    });
  });

  afterEach(async () => {
    delete process.env.WAADA_DATA_DIR;
    await rm(dataDir, { force: true, recursive: true });
  });

  it("returns text and a schema-valid object", async () => {
    const llm = await createLLM();
    await expect(
      llm.chat({ system: "Reply concisely.", user: "Say hello." }),
    ).resolves.toBeTruthy();
    await expect(
      llm.extract({
        system: "Extract the requested field.",
        user: "The customer is Acme.",
        schema: z.object({ customer: z.string() }),
        name: "customer",
        description: "A customer name.",
      }),
    ).resolves.toEqual({ customer: "Acme" });
  });
});
