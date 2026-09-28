import { APICallError } from "ai";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { ConfigError, ExternalServiceError } from "../src/errors.ts";

const mocks = vi.hoisted(() => ({
  createLanguageModel: vi.fn(() => ({}) as never),
  generateObject: vi.fn(),
  generateText: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
}));

vi.mock("ai", async (importOriginal) => ({
  ...(await importOriginal<typeof import("ai")>()),
  generateObject: mocks.generateObject,
  generateText: mocks.generateText,
}));

vi.mock("../src/llm/providers.ts", () => ({
  createLanguageModel: mocks.createLanguageModel,
}));

vi.mock("../src/log.ts", () => ({
  log: { info: mocks.info, warn: mocks.warn },
}));

import { extract } from "../src/llm/extract.ts";

const Item = z.object({ value: z.string() });
const settings = {
  provider: "groq" as const,
  model: "test-model",
  credentials: { groq: { apiKey: "test-key" } },
};
const args = {
  system: "Extract one item.",
  user: "The value is green.",
  schema: Item,
  name: "item",
  description: "An extracted item.",
};

function invalidJsonSchemaError(): APICallError {
  return new APICallError({
    message: "Generated JSON does not match the expected schema",
    url: "https://api.groq.com/openai/v1/chat/completions",
    requestBodyValues: {},
    statusCode: 400,
    isRetryable: false,
    data: { error: { code: "json_validate_failed" } },
  });
}

describe("LLM extraction recovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the first schema-valid structured object", async () => {
    mocks.generateObject.mockResolvedValueOnce({ object: { value: "green" } });

    await expect(extract(settings, args)).resolves.toEqual({ value: "green" });
    expect(mocks.generateObject).toHaveBeenCalledTimes(1);
    expect(mocks.generateText).not.toHaveBeenCalled();
    expect(mocks.info).toHaveBeenCalledWith(
      "LLM structured extraction succeeded",
      expect.objectContaining({ model: "test-model" }),
    );
  });

  it("retries malformed structured output with validation details and schema", async () => {
    mocks.generateObject
      .mockResolvedValueOnce({ object: { value: 42 } })
      .mockResolvedValueOnce({ object: { value: "green" } });

    await expect(extract(settings, args)).resolves.toEqual({ value: "green" });
    expect(mocks.generateObject).toHaveBeenCalledTimes(2);
    const repair = mocks.generateObject.mock.calls[1]?.[0]?.prompt as string;
    expect(repair).toContain("corrected JSON object only");
    expect(repair).toContain("Expected schema");
    expect(repair).toContain("value");
  });

  it("uses code-fenced plain JSON only after both structured attempts fail", async () => {
    mocks.generateObject
      .mockResolvedValueOnce({ object: { value: 42 } })
      .mockResolvedValueOnce({ object: { value: 42 } });
    mocks.generateText.mockResolvedValueOnce({ text: '```json\n{"value":"green"}\n```' });

    await expect(extract(settings, args)).resolves.toEqual({ value: "green" });
    expect(mocks.generateObject).toHaveBeenCalledTimes(2);
    expect(mocks.generateText).toHaveBeenCalledTimes(1);
  });

  it("recovers from a provider's invalid-JSON schema 400", async () => {
    mocks.generateObject
      .mockRejectedValueOnce(invalidJsonSchemaError())
      .mockResolvedValueOnce({ object: { value: "green" } });

    await expect(extract(settings, args)).resolves.toEqual({ value: "green" });
    expect(mocks.generateObject).toHaveBeenCalledTimes(2);
    expect(mocks.generateText).not.toHaveBeenCalled();
  });

  it("recognizes the invalid-JSON code in a provider response body", async () => {
    mocks.generateObject
      .mockRejectedValueOnce(
        new APICallError({
          message: "bad request",
          url: "https://api.groq.com/openai/v1/chat/completions",
          requestBodyValues: {},
          statusCode: 400,
          isRetryable: false,
          responseBody: JSON.stringify({ error: { code: "json_validate_failed" } }),
        }),
      )
      .mockResolvedValueOnce({ object: { value: "green" } });

    await expect(extract(settings, args)).resolves.toEqual({ value: "green" });
  });

  it("uses the fallback model after a primary provider failure", async () => {
    mocks.generateObject
      .mockRejectedValueOnce(new Error("primary unavailable"))
      .mockResolvedValueOnce({ object: { value: "green" } });

    await expect(extract({ ...settings, fallbackModel: "fallback-model" }, args)).resolves.toEqual({
      value: "green",
    });
    const modelCalls = mocks.createLanguageModel.mock.calls as unknown as Array<[unknown, string]>;
    expect(modelCalls.map((call) => call[1])).toEqual(["test-model", "fallback-model"]);
    expect(mocks.warn).toHaveBeenCalledWith(
      "LLM structured extraction falling back to configured model",
      expect.objectContaining({ model: "fallback-model", previousModel: "test-model" }),
    );
    expect(mocks.info).toHaveBeenCalledWith(
      "LLM structured extraction succeeded",
      expect.objectContaining({ model: "fallback-model" }),
    );
  });

  it("stops immediately for a configuration error", async () => {
    mocks.createLanguageModel.mockImplementationOnce(() => {
      throw new ConfigError("Add a Groq API key in Settings to use Groq.");
    });

    await expect(
      extract({ ...settings, fallbackModel: "fallback-model" }, args),
    ).rejects.toBeInstanceOf(ConfigError);
    expect(mocks.createLanguageModel).toHaveBeenCalledTimes(1);
    expect(mocks.generateObject).not.toHaveBeenCalled();
  });

  it("returns null for garbage after every recovery stage", async () => {
    mocks.generateObject
      .mockResolvedValueOnce({ object: { value: 42 } })
      .mockResolvedValueOnce({ object: { value: 42 } });
    mocks.generateText.mockResolvedValueOnce({ text: "not json" });

    await expect(extract(settings, args)).resolves.toBeNull();
    expect(mocks.warn).toHaveBeenCalledWith(
      "LLM structured extraction returned no valid object",
      expect.objectContaining({
        attempts: expect.stringContaining("value: invalid_type"),
      }),
    );
    const fields = mocks.warn.mock.calls[0]?.[1] as { attempts: string };
    expect(fields.attempts.length).toBeLessThanOrEqual(300);
    expect(fields.attempts).not.toContain("not json");
  });

  it("maps provider failures to a safe external-service error", async () => {
    mocks.generateObject.mockRejectedValueOnce(new Error("provider unavailable"));

    await expect(extract(settings, args)).rejects.toBeInstanceOf(ExternalServiceError);
    expect(mocks.generateObject).toHaveBeenCalledTimes(1);
    expect(mocks.generateText).not.toHaveBeenCalled();
  });
});
