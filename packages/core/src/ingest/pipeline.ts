// Ingest pipeline (M03): stores new Interactions in memory exactly once.
// Dedupe state lives in `.waada/manifest.json`, keyed by account.
import { z } from "zod";
import { createLogger } from "../log.ts";
import type { Memory } from "../memory/index.ts";
import { createMemory } from "../memory/index.ts";
import { type IngestReport, Interaction, type Interaction as InteractionT } from "../models.ts";
import { readJson, writeJson } from "../store.ts";

const log = createLogger("ingest");

const MANIFEST_FILE = "manifest.json";
const StoredInteractions = Interaction.array();

/** account → sourceIds already stored in memory. */
export const Manifest = z.record(z.string(), z.array(z.string()));
export type Manifest = z.infer<typeof Manifest>;

/** Stores new interactions in memory; skips ones already ingested (dedupe via .waada/manifest.json). */
export async function ingest(
  items: InteractionT[],
  deps?: { memory?: Memory },
): Promise<IngestReport> {
  const errors: string[] = [];
  const valid: InteractionT[] = [];
  for (const item of items) {
    const parsed = Interaction.safeParse(item);
    if (!parsed.success) {
      const id =
        typeof (item as Partial<InteractionT>)?.sourceId === "string" &&
        (item as Partial<InteractionT>).sourceId !== ""
          ? (item as InteractionT).sourceId
          : "<unknown sourceId>";
      errors.push(
        `${id}: invalid interaction (${parsed.error.issues[0]?.message ?? "schema mismatch"})`,
      );
      continue;
    }
    valid.push(parsed.data);
  }
  valid.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  const manifest = await readJson(MANIFEST_FILE, Manifest, {});
  const seen = new Map<string, Set<string>>(
    Object.entries(manifest).map(([account, ids]) => [account, new Set(ids)]),
  );
  const isNew = (i: InteractionT): boolean => !seen.get(i.account)?.has(i.sourceId);

  let memory = deps?.memory;
  if (memory === undefined) {
    if (!valid.some(isNew)) {
      // Already in memory: still save them, so baselines see a re-import (P-006).
      await persistInteractions(valid, { replace: false });
      return { added: 0, skipped: 0, errors };
    }
    memory = createMemory();
  }

  let added = 0;
  let skipped = 0;
  const persisted: InteractionT[] = [];
  const alreadyStored: InteractionT[] = [];
  const banked = new Set<string>();
  for (const item of valid) {
    if (!isNew(item)) {
      skipped += 1;
      alreadyStored.push(item);
      continue;
    }
    try {
      if (!banked.has(item.account)) {
        await memory.ensureBank(item.account);
        banked.add(item.account);
      }
      await memory.remember(item);
    } catch (err) {
      errors.push(`${item.sourceId}: ${(err as Error).message}`);
      continue;
    }
    added += 1;
    let ids = seen.get(item.account);
    if (!ids) {
      ids = new Set();
      seen.set(item.account, ids);
    }
    ids.add(item.sourceId);
    manifest[item.account] = [...ids];
    await writeJson(MANIFEST_FILE, manifest);
    persisted.push(item);
    log.debug("ingested interaction", { account: item.account, sourceId: item.sourceId });
  }
  await persistInteractions(persisted, { replace: true });
  await persistInteractions(alreadyStored, { replace: false });
  return { added, skipped, errors };
}

/**
 * Merges interactions (by sourceId) into `.waada/interactions/<account>.json` for the baselines (P-006).
 * `replace: false` only fills gaps, so a re-imported duplicate never overwrites what memory holds.
 */
async function persistInteractions(
  items: InteractionT[],
  opts: { replace: boolean },
): Promise<void> {
  const byAccount = new Map<string, InteractionT[]>();
  for (const item of items)
    byAccount.set(item.account, [...(byAccount.get(item.account) ?? []), item]);
  for (const [account, newItems] of byAccount) {
    const existing = await readJson(`interactions/${account}.json`, StoredInteractions, []);
    const merged = new Map(existing.map((item) => [item.sourceId, item]));
    for (const item of newItems) {
      if (opts.replace || !merged.has(item.sourceId)) merged.set(item.sourceId, item);
    }
    await writeJson(`interactions/${account}.json`, [...merged.values()]);
  }
}
