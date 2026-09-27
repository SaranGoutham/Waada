// STUB (M00). Owned by M03: replace with dedupe (.waada/manifest.json) and the file parsers.
import type { LLM } from "../llm/index.ts";
import type { Memory } from "../memory/index.ts";
import type { FileInput, IngestReport, Interaction } from "../models.ts";

/** Stores new interactions in memory; skips ones already ingested (dedupe via .waada/manifest.json). */
export async function ingest(
  _items: Interaction[],
  _deps?: { memory?: Memory },
): Promise<IngestReport> {
  throw new Error("not implemented: ingest");
}

/** Dispatches each file to its parser by extension. */
export async function parseFiles(
  _files: FileInput[],
  _account: string,
  _deps?: { llm?: LLM },
): Promise<{ interactions: Interaction[]; errors: string[] }> {
  throw new Error("not implemented: ingest");
}
