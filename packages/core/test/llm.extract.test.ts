import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { ExternalServiceError } from "../src/errors.ts";

const mocks = vi.hoisted(() => ({
  createLanguageModel: vi.fn(() => ({}) as never),
  generateObject: vi.fn(),
  generateText: vi.fn(),
}));

vi.mock("ai", async (importOriginal) => ({
  ...(await importOriginal<typeof import("ai")>()),
  generateObject: mocks.generateObject,
  generateText: mocks.generateText,
}));

vi.mock("../src/llm/providers.ts", () => ({
  createLanguageModel: mocks.createLanguageModel,
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

describe("LLM extraction recovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the first schema-valid structured object", async () => {
    mocks.generateObject.mockResolvedValueOnce({ object: { value: "green" } });

    await expect(extract(settings, args)).resolves.toEqual({ value: "green" });
    expect(mocks.generateObject).toHaveBeenCalledTimes(1);
    expect(mocks.generateText).not.toHaveBeenCalled();
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

  it("returns null for garbage after every recovery stage", async () => {
    mocks.generateObject
      .mockResolvedValueOnce({ object: { value: 42 } })
      .mockResolvedValueOnce({ object: { value: 42 } });
    mocks.generateText.mockResolvedValueOnce({ text: "not json" });

    await expect(extract(settings, args)).resolves.toBeNull();
  });

  it("maps provider failures to a safe external-service error", async () => {
    mocks.generateObject.mockRejectedValueOnce(new Error("provider unavailable"));

    await expect(extract(settings, args)).rejects.toBeInstanceOf(ExternalServiceError);
    expect(mocks.generateObject).toHaveBeenCalledTimes(1);
    expect(mocks.generateText).not.toHaveBeenCalled();
  });
});
