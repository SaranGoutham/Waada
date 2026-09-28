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

function validationReason(error: z.ZodError<unknown>): string {
  return error.issues
    .map((issue) => `${issue.path.length > 0 ? issue.path.join(".") : "(root)"}: ${issue.code}`)
    .join("; ");
}

function providerReason(error: unknown): string {
  if (!APICallError.isInstance(error)) return "malformed structured response";
  const data = error.data as { error?: { code?: unknown }; code?: unknown } | undefined;
  let body: { error?: { code?: unknown }; code?: unknown } | undefined;
  try {
    body = error.responseBody ? JSON.parse(error.responseBody) : undefined;
  } catch {
    // Provider error bodies can be non-JSON.
  }
  const code = data?.error?.code ?? data?.code ?? body?.error?.code ?? body?.code;
  return typeof code === "string" ? `provider code ${code}` : "malformed structured response";
}

function cappedAttemptReasons(reasons: string[]): string {
  return reasons.join("; ").slice(0, 300);
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
  const attemptReasons: string[] = [];
  try {
    const result = await objectCall(args.user);
    const parsed = args.schema.safeParse(result.object);
    if (parsed.success) {
      log.info("LLM structured extraction succeeded", {
        provider: settings.provider,
        model: modelId,
        name: args.name,
      });
      return parsed.data;
    }
    validationDetail = parsed.error.message;
    attemptReasons.push(`structured attempt 1: ${validationReason(parsed.error)}`);
  } catch (error) {
    if (!malformedObjectError(error)) throw externalFailure(settings, error);
    validationDetail = error instanceof Error ? error.message : validationDetail;
    attemptReasons.push(`structured attempt 1: ${providerReason(error)}`);
  }
  try {
    const result = await objectCall(repairPrompt(args, validationDetail));
    const parsed = args.schema.safeParse(result.object);
    if (parsed.success) {
      log.info("LLM structured extraction succeeded", {
        provider: settings.provider,
        model: modelId,
        name: args.name,
      });
      return parsed.data;
    }
    attemptReasons.push(`structured attempt 2: ${validationReason(parsed.error)}`);
  } catch (error) {
    if (!malformedObjectError(error)) throw externalFailure(settings, error);
    attemptReasons.push(`structured attempt 2: ${providerReason(error)}`);
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
    if (parsed.success) {
      log.info("LLM structured extraction succeeded", {
        provider: settings.provider,
        model: modelId,
        name: args.name,
      });
      return parsed.data;
    }
    attemptReasons.push(`plain JSON attempt: ${validationReason(parsed.error)}`);
  } catch {
    // Bad plain JSON from the model is intentionally non-fatal for this contract.
    attemptReasons.push("plain JSON attempt: invalid JSON");
  }
  log.warn("LLM structured extraction returned no valid object", {
    provider: settings.provider,
    name: args.name,
    attempts: cappedAttemptReasons(attemptReasons),
  });
  return null;
}

export async function extract<T>(settings: LlmSettings, args: ExtractArgs<T>): Promise<T | null> {
  const models = [settings.model];
  if (settings.fallbackModel && settings.fallbackModel !== settings.model)
    models.push(settings.fallbackModel);
  let lastError: unknown;
  for (const [index, modelId] of models.entries()) {
    try {
      return await extractWithModel(settings, args, modelId);
    } catch (error) {
      if (error instanceof ConfigError) throw error;
      lastError = error;
      const fallbackModel = models[index + 1];
      if (fallbackModel) {
        log.warn("LLM structured extraction falling back to configured model", {
          model: fallbackModel,
          previousModel: modelId,
        });
      }
    }
  }
  throw lastError;
}
