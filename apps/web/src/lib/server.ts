import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { fakeAnswer, fakeBrief, fakeCompare } from "./fake-agent";

const AccountInput = z.object({ name: z.string().min(1) });
const AccountSlug = z.object({ account: z.string().min(1) });
const AskInput = AccountSlug.extend({ question: z.string().min(1) });
const SettingsInput = z.object({
  model: z.string().min(1),
  fallbackModel: z.string(),
  apiKey: z.string(),
});
const ImportInput = AccountSlug.extend({
  files: z.array(z.object({ name: z.string(), data: z.instanceof(Uint8Array) })),
});
const IntegrationName = z.enum(["gmail", "slack", "hubspot", "meet", "mcp"]);
const IntegrationInput = z.object({
  name: IntegrationName,
  label: z.string().min(1).max(120),
});
const IntegrationRecord = z.object({
  connected: z.boolean(),
  connectedAt: z.string().datetime().optional(),
  label: z.string().optional(),
});
const Integrations = z.partialRecord(IntegrationName, IntegrationRecord);
const fakeCore = () => process.env.WAADA_FAKE_CORE === "1";

async function invoke<T>(run: (core: typeof import("@waada/core")) => Promise<T>): Promise<T> {
  try {
    return await run(await import("@waada/core"));
  } catch (error) {
    return safe(error);
  }
}
async function safe(error: unknown): Promise<never> {
  const { WaadaError } = await import("@waada/core");
  if (error instanceof WaadaError) throw new Error(error.message);
  throw new Error("Something went wrong. Check the server log.");
}

export const getAccounts = createServerFn({ method: "GET" }).handler(async () => {
  return invoke(({ listAccounts }) => listAccounts());
});
export const createAccount = createServerFn({ method: "POST" })
  .validator(AccountInput)
  .handler(async ({ data }) => {
    return invoke(({ upsertAccount }) => upsertAccount(data));
  });
export const getBrief = createServerFn({ method: "GET" })
  .validator(AccountSlug)
  .handler(async ({ data }) => {
    return fakeCore() ? fakeBrief(data.account) : invoke(({ brief }) => brief(data.account));
  });
export const getAnswer = createServerFn({ method: "POST" })
  .validator(AskInput)
  .handler(async ({ data }) => {
    return fakeCore()
      ? fakeAnswer(data.question)
      : invoke(({ ask }) => ask(data.account, data.question));
  });
export const getCompare = createServerFn({ method: "GET" })
  .validator(AccountSlug)
  .handler(async ({ data }) => {
    return fakeCore() ? fakeCompare() : invoke(({ compare }) => compare(data.account));
  });
export const getSettings = createServerFn({ method: "GET" }).handler(async () => {
  return invoke(async ({ getEnv, getLlmSettings, redactedSettings }) => {
    const settings = await getLlmSettings();
    const value = redactedSettings(settings);
    const groqKeySource = settings.credentials.groq
      ? "settings"
      : getEnv().groqApiKey
        ? "env"
        : "none";
    return {
      model: value.model,
      fallbackModel: value.fallbackModel ?? "",
      groqConfigured: Boolean(value.credentials.groq),
      groqKeySource,
    };
  });
});
export const saveSettings = createServerFn({ method: "POST" })
  .validator(SettingsInput)
  .handler(async ({ data }) => {
    return invoke(async ({ getLlmSettings, saveLlmSettings }) => {
      const current = await getLlmSettings();
      const credentials = { ...current.credentials };
      if (data.apiKey.trim()) credentials.groq = { apiKey: data.apiKey.trim() };
      await saveLlmSettings({
        ...current,
        provider: "groq",
        model: data.model,
        fallbackModel: data.fallbackModel || undefined,
        credentials,
      });
      return { ok: true };
    });
  });
export const testSettings = createServerFn({ method: "POST" }).handler(async () => {
  return invoke(async ({ createLLM }) => {
    const llm = await createLLM();
    return { text: await llm.chat({ system: "Reply with OK.", user: "Test connection." }) };
  });
});
export const previewImport = createServerFn({ method: "POST" })
  .validator(ImportInput)
  .handler(async ({ data }) => {
    return invoke(async ({ createLLM, parseFiles }) =>
      parseFiles(data.files, data.account, { llm: await createLLM() }),
    );
  });
export const runImport = createServerFn({ method: "POST" })
  .validator(ImportInput)
  .handler(async ({ data }) => {
    return invoke(async ({ createLLM, ingest, parseFiles, saveCrmRecord }) => {
      const crmFiles = data.files.filter(
        (file) => file.name.replace(/\\/g, "/").split("/").pop()?.toLowerCase() === "crm.json",
      );
      for (const file of crmFiles) await saveCrmRecord(data.account, file);
      const parsed = await parseFiles(data.files, data.account, { llm: await createLLM() });
      return { parsed, report: await ingest(parsed.interactions), crmSaved: crmFiles.length > 0 };
    });
  });

export const getAppMode = createServerFn({ method: "GET" }).handler(() => ({
  fakeCore: fakeCore(),
}));

export const getIntegrations = createServerFn({ method: "GET" }).handler(async () => {
  return invoke(async ({ getEnv, getLlmSettings, readJson }) => {
    const [saved, settings] = await Promise.all([
      readJson("integrations.json", Integrations, {}),
      getLlmSettings(),
    ]);
    return {
      saved,
      hindsightConfigured: Boolean(getEnv().hindsightBaseUrl),
      groqConfigured: Boolean(settings.credentials.groq || getEnv().groqApiKey),
    };
  });
});

export const connectIntegration = createServerFn({ method: "POST" })
  .validator(IntegrationInput)
  .handler(async ({ data }) => {
    return invoke(async ({ readJson, writeJson }) => {
      const saved = await readJson("integrations.json", Integrations, {});
      const next = {
        ...saved,
        [data.name]: { connected: true, connectedAt: new Date().toISOString(), label: data.label },
      };
      await writeJson("integrations.json", next);
      return next;
    });
  });

export const disconnectIntegration = createServerFn({ method: "POST" })
  .validator(z.object({ name: IntegrationName }))
  .handler(async ({ data }) => {
    return invoke(async ({ readJson, writeJson }) => {
      const saved = await readJson("integrations.json", Integrations, {});
      const next = { ...saved, [data.name]: { connected: false } };
      await writeJson("integrations.json", next);
      return next;
    });
  });

export const getPipelineStats = createServerFn({ method: "GET" })
  .validator(AccountSlug)
  .handler(async ({ data }) => {
    return invoke(async ({ Interaction, readJson }) => {
      const interactions = await readJson(
        `interactions/${data.account}.json`,
        z.array(Interaction),
        [],
      );
      const latestInteraction = interactions.reduce<string | undefined>(
        (latest, item) => (!latest || item.date > latest ? item.date : latest),
        undefined,
      );
      return {
        interactions: interactions.length,
        latestInteraction,
        sources: Object.fromEntries(
          ["email", "slack", "call", "meeting", "note"].map((type) => [
            type,
            interactions.filter((item) => item.type === type).length,
          ]),
        ),
      };
    });
  });

export const getImportedInteractions = createServerFn({ method: "GET" })
  .validator(AccountSlug)
  .handler(async ({ data }) => {
    return invoke(async ({ Interaction, readJson }) =>
      readJson(`interactions/${data.account}.json`, z.array(Interaction), []),
    );
  });
