// Live smoke test against a real Hindsight (pnpm test:live; needs HINDSIGHT_BASE_URL/_API_KEY in .env).
// The document check uses plain fetch on the REST API, so this file doesn't import the SDK.
import { afterAll, describe, expect, it } from "vitest";
import { bankIdFor, getEnv } from "../src/config.ts";
import { ExternalServiceError } from "../src/errors.ts";
import { createMemory } from "../src/memory/index.ts";
import type { Interaction } from "../src/models.ts";

const ACCOUNT = "smoke";
const DOC_ID = "file:smoke0000000001";
const memory = createMemory();

const call: Interaction = {
  account: ACCOUNT,
  sourceId: DOC_ID,
  type: "call",
  date: "2026-08-12T15:00:00.000Z",
  title: "Discovery call — champion",
  participants: ["Dana Reyes", "Sam Lee"],
  content:
    "Discovery call with Acme on August 12, 2026. Dana Reyes, VP of Engineering, said she is our champion and will push the security review internally. Sam Lee promised to send the SOC 2 Type II report by Friday.",
  source: "transcript",
};

async function hindsightGet(path: string): Promise<unknown> {
  const { hindsightBaseUrl, hindsightApiKey } = getEnv();
  const res = await fetch(`${hindsightBaseUrl}${path}`, {
    headers: hindsightApiKey ? { Authorization: `Bearer ${hindsightApiKey}` } : {},
  });
  if (!res.ok) throw new Error(`GET ${path} → HTTP ${res.status}`);
  return res.json();
}

describe("Hindsight memory (live)", () => {
  afterAll(async () => {
    await memory.deleteBank(ACCOUNT).catch(() => {});
  });

  it("ensureBank → remember → search → reflect → re-retain → deleteBank", async () => {
    await memory.deleteBank(ACCOUNT).catch(() => {}); // clean slate from an earlier failed run
    expect(await memory.ensureBank(ACCOUNT)).toBe("waada-smoke");

    await memory.remember(call);

    const hits = await memory.search(ACCOUNT, "Who is the champion?");
    console.info("search hits:", JSON.stringify(hits, null, 2));
    const champion = hits.find((h) => /Dana/.test(h.text));
    expect(champion, "a hit mentioning Dana").toBeDefined();
    expect(champion?.date?.slice(0, 10)).toBe("2026-08-12");
    expect(champion?.documentId).toBe(DOC_ID);

    const answer = await memory.reflect(ACCOUNT, "Who is our champion and what did we promise?");
    console.info("reflect:", answer);
    expect(answer.trim().length).toBeGreaterThan(0);

    // Same document_id twice: replace or duplicate? (recorded in docs/reports/m01-memory.md)
    await memory.remember({ ...call, content: `${call.content} Update: the report was sent.` });
    const bank = bankIdFor(ACCOUNT);
    const docs = (await hindsightGet(`/v1/default/banks/${bank}/documents`)) as {
      items: { id: string }[];
      total: number;
    };
    const doc = (await hindsightGet(
      `/v1/default/banks/${bank}/documents/${encodeURIComponent(DOC_ID)}`,
    )) as { original_text: string | null };
    console.info("documents after re-retain:", JSON.stringify(docs.items.map((d) => d.id)));
    console.info("document text now:", doc.original_text);
    expect(docs.items.filter((d) => d.id === DOC_ID)).toHaveLength(1);
    expect(doc.original_text).toContain("Update: the report was sent.");

    await memory.deleteBank(ACCOUNT);
  }, 300_000);

  it("search on a bank that was never created returns no hits; reflect still answers", async () => {
    await memory.deleteBank("smoke-missing").catch(() => {});
    expect(await memory.search("smoke-missing", "anything")).toEqual([]);
    try {
      console.info("missing bank reflect →", await memory.reflect("smoke-missing", "anything"));
    } catch (err) {
      console.info("missing bank reflect threw:", (err as Error).message);
      expect(err).toBeInstanceOf(ExternalServiceError);
    }
    await memory.deleteBank("smoke-missing").catch(() => {}); // reflect may have created it
  }, 120_000);
});
