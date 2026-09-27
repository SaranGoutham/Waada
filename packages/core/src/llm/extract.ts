import { generateObject, generateText, NoObjectGeneratedError } from "ai";
import { z } from "zod";
import { ExternalServiceError } from "../errors.ts";
import { log } from "../log.ts";
import { createLanguageModel } from "./providers.ts";
import { withRateLimitRetry } from "./retry.ts";
import type { LlmSettings } from "./settings.ts";

type ExtractArgs<T> = {
  system: string;
  user: string;
  schema: z.ZodType<T>;
  name: string;
  description: string;
  temperature?: number;
};

function unfence(value: string): string {
  return value
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
}

function repairPrompt<T>(args: ExtractArgs<T>, validationDetail: string): string {
  return [
    args.user,
    "",
    "Return a corrected JSON object only. It must conform exactly to the requested schema.",
    `Validation error: ${validationDetail}`,
    `Expected schema: ${JSON.stringify(z.toJSONSchema(args.schema))}`,
  ].join("\n");
}

function externalFailure(error: unknown): ExternalServiceError {
  return new ExternalServiceError(
    "Could not extract structured data. Check the provider and Settings.",
    { cause: error },
  );
}

export async function extract<T>(settings: LlmSettings, args: ExtractArgs<T>): Promise<T | null> {
  const model = createLanguageModel(settings);
  // maxRetries: 0 on every SDK call: llm/retry.ts is the single retry layer
  // (429 → retry-after wait, ≤ 2 retries, never 413), not the SDK on top.
  const objectCall = (prompt: string) =>
    withRateLimitRetry(() =>
      generateObject({
        model,
        schema: args.schema,
        schemaName: args.name,
        schemaDescription: args.description,
        system: args.system,
        prompt,
        temperature: args.temperature,
        maxRetries: 0,
      }),
    );
  const textCall = (prompt: string) =>
    withRateLimitRetry(() =>
      generateText({
        model,
        system: args.system,
        prompt,
        temperature: args.temperature,
        maxRetries: 0,
      }),
    );
  let validationDetail = "The response did not match the requested schema.";
  try {
    const result = await objectCall(args.user);
    const parsed = args.schema.safeParse(result.object);
    if (parsed.success) return parsed.data;
    validationDetail = parsed.error.message;
  } catch (error) {
    if (!NoObjectGeneratedError.isInstance(error)) throw externalFailure(error);
    validationDetail = error.message;
  }
  try {
    const result = await objectCall(repairPrompt(args, validationDetail));
    const parsed = args.schema.safeParse(result.object);
    if (parsed.success) return parsed.data;
  } catch (error) {
    if (!NoObjectGeneratedError.isInstance(error)) throw externalFailure(error);
  }
  let plainText: string;
  try {
    const result = await textCall(
      `${args.user}\n\nReturn only valid JSON for ${args.name}; no Markdown or explanation.`,
    );
    plainText = result.text;
  } catch (error) {
    throw externalFailure(error);
  }
  try {
    const parsed = args.schema.safeParse(JSON.parse(unfence(plainText)));
    if (parsed.success) return parsed.data;
  } catch {
    // Bad plain JSON from the model is intentionally non-fatal for this contract.
  }
  log.warn("LLM structured extraction returned no valid object", {
    provider: settings.provider,
    name: args.name,
  });
  return null;
}
