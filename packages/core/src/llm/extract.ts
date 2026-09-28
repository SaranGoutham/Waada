import { APICallError, generateObject, generateText, NoObjectGeneratedError } from "ai";
import { z } from "zod";
import { ConfigError, ExternalServiceError } from "../errors.ts";
import { log } from "../log.ts";
import { createLanguageModel } from "./providers.ts";
import { dailyLimitMessage, withRateLimitRetry } from "./retry.ts";
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

function externalFailure(settings: LlmSettings, error: unknown): ExternalServiceError {
  return new ExternalServiceError(
    dailyLimitMessage(settings.provider, error) ??
      "Could not extract structured data. Check the provider and Settings.",
    { cause: error },
  );
}

function invalidJsonSchemaError(error: unknown): boolean {
  if (!APICallError.isInstance(error) || error.statusCode !== 400) return false;
  const data = error.data as { error?: { code?: unknown }; code?: unknown } | undefined;
  let body: { error?: { code?: unknown }; code?: unknown } | undefined;
  try {
    body = error.responseBody ? JSON.parse(error.responseBody) : undefined;
  } catch {
    // Some providers return a non-JSON error body; inspect its message below.
  }
  const code = data?.error?.code ?? data?.code ?? body?.error?.code ?? body?.code;
  if (code === "json_validate_failed") return true;
  // VERIFY: @ai-sdk/groq 4.0.50 declares only error.message/type, while Groq's
  // live response reported `json_validate_failed`; retain this exact fallback
  // until the provider exposes that code in its public error schema.
  const detail = `${error.message}\n${error.responseBody ?? ""}`.toLowerCase();
  return detail.includes("generated json does not match the expected schema");
}

function malformedObjectError(error: unknown): boolean {
  return NoObjectGeneratedError.isInstance(error) || invalidJsonSchemaError(error);
}

async function extractWithModel<T>(
  settings: LlmSettings,
  args: ExtractArgs<T>,
  modelId: string,
): Promise<T | null> {
  const model = createLanguageModel(settings, modelId);
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
    if (!malformedObjectError(error)) throw externalFailure(settings, error);
    validationDetail = error instanceof Error ? error.message : validationDetail;
  }
  try {
    const result = await objectCall(repairPrompt(args, validationDetail));
    const parsed = args.schema.safeParse(result.object);
    if (parsed.success) return parsed.data;
  } catch (error) {
    if (!malformedObjectError(error)) throw externalFailure(settings, error);
  }
  let plainText: string;
  try {
    const result = await textCall(
      `${args.user}\n\nReturn only valid JSON for ${args.name}; no Markdown or explanation.`,
    );
    plainText = result.text;
  } catch (error) {
    throw externalFailure(settings, error);
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

export async function extract<T>(settings: LlmSettings, args: ExtractArgs<T>): Promise<T | null> {
  const models = [settings.model];
  if (settings.fallbackModel && settings.fallbackModel !== settings.model)
    models.push(settings.fallbackModel);
  let lastError: unknown;
  for (const modelId of models) {
    try {
      return await extractWithModel(settings, args, modelId);
    } catch (error) {
      if (error instanceof ConfigError) throw error;
      lastError = error;
    }
  }
  throw lastError;
}
