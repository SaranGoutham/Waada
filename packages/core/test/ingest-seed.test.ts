import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseFiles } from "../src/ingest/parse-files.ts";
import { type FileInput, Interaction } from "../src/models.ts";
import { FakeLLM } from "./fakes.ts";

const SEED = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "seed", "acme");

async function seedFiles(): Promise<FileInput[]> {
  const files: FileInput[] = [];
  for (const name of (await readdir(join(SEED, "emails"))).sort()) {
    if (name.endsWith(".eml")) {
      files.push({ name, data: new Uint8Array(await readFile(join(SEED, "emails", name))) });
    }
  }
  for (const name of (await readdir(join(SEED, "slack", "deal-acme"))).sort()) {
    if (/^20\d\d-\d\d-\d\d\.json$/.test(name)) {
      files.push({
        name: `deal-acme/${name}`,
        data: new Uint8Array(await readFile(join(SEED, "slack", "deal-acme", name))),
      });
    }
  }
  for (const name of (await readdir(join(SEED, "transcripts"))).sort()) {
    if (name.endsWith(".txt")) {
      files.push({
        name,
        data: new Uint8Array(await readFile(join(SEED, "transcripts", name))),
      });
    }
  }
  return files;
}

describe("seed/acme end to end", () => {
  it("parseFiles over all seed files yields 33 interactions with no errors", async () => {
    const files = await seedFiles();
    expect(files).toHaveLength(33);
    // Transcripts sort call-04 before call-07, matching this queue order.
    const llm = new FakeLLM({
      extract: {
        "transcript-metadata": [
          {
            date: "2026-08-20T10:00:00.000Z",
            title: "Call #4 — pilot scoping",
            participants: ["Priya Nair", "Meenakshi Rao", "Alex Rivera"],
            type: "call",
          },
          {
            date: "2026-09-11T10:00:00.000Z",
            title: "Call #7 — commercial terms",
            participants: ["Priya Nair", "Alex Rivera"],
            type: "call",
          },
        ],
      },
    });
    const { interactions, errors } = await parseFiles(files, "acme", { llm });
    expect(errors).toEqual([]);
    expect(interactions).toHaveLength(33);
    for (const i of interactions) {
      expect(Interaction.safeParse(i).success).toBe(true);
      expect(i.account).toBe("acme");
    }
    const bySource = new Map<string, number>();
    for (const i of interactions) bySource.set(i.source, (bySource.get(i.source) ?? 0) + 1);
    expect(bySource.get("eml")).toBe(14);
    expect(bySource.get("transcript")).toBe(8);
    expect(bySource.get("slack_export")).toBe(11);
    expect(new Set(interactions.map((i) => i.sourceId)).size).toBe(33);
  });
});
