import { z } from "zod";
import { WaadaError } from "../errors.ts";
import type { FileInput } from "../models.ts";
import { writeJson } from "../store.ts";

const CrmField = z.union([z.string(), z.number(), z.boolean(), z.null()]);
export const CrmRecord = z.record(z.string(), CrmField);

/** Saves the flat field record supplied as `crm.json` alongside imported interactions. */
export async function saveCrmRecord(account: string, file: FileInput): Promise<void> {
  let raw: unknown;
  try {
    raw = JSON.parse(new TextDecoder().decode(file.data));
  } catch (err) {
    throw new WaadaError("crm.json is not valid JSON.", { cause: err });
  }
  const parsed = CrmRecord.safeParse(raw);
  if (!parsed.success) {
    throw new WaadaError("crm.json must be a flat JSON object of fields.");
  }
  await writeJson(`crm/${account}.json`, parsed.data);
}
