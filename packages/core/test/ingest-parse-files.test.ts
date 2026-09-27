import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseFiles } from "../src/ingest/parse-files.ts";
import type { FileInput } from "../src/models.ts";
import { FakeLLM } from "./fakes.ts";

const DIR = join(dirname(fileURLToPath(import.meta.url)), "fixtures", "ingest");

async function fixture(name: string, as?: string): Promise<FileInput> {
  return { name: as ?? name, data: new Uint8Array(await readFile(join(DIR, name))) };
}

const META = {
  date: "2026-08-20T10:00:00.000Z",
  title: "Pilot scoping session",
  participants: ["Priya Nair"],
  type: "call",
} as const;

describe("parseFiles", () => {
  it("dispatches by extension, transcribes audio, and collects errors", async () => {
    const llm = new FakeLLM({
      transcribe: "Alex Rivera: hello from the call",
      extract: { "transcript-metadata": [{ ...META }] },
    });
    const { interactions, errors } = await parseFiles(
      [
        await fixture("plain.eml"),
        await fixture("slack-day.json", "deal-acme/2026-07-15.json"),
        await fixture("with-header.txt"),
        { name: "call-09-followup.mp3", data: new Uint8Array([1, 2, 3]) },
        { name: "notes.pdf", data: new Uint8Array([9]) },
      ],
      "acme",
      { llm },
    );
    const bySource = new Map(interactions.map((i) => [i.source, i]));
    expect(bySource.get("eml")!.type).toBe("email");
    expect(bySource.get("slack_export")!.type).toBe("slack");
    expect(bySource.get("transcript")!.title).toBe("Call #2 — pricing discussion");
    const audio = bySource.get("audio")!;
    expect(audio.type).toBe("call");
    expect(audio.content).toContain("hello from the call");
    expect(errors).toEqual(['notes.pdf: unsupported extension ".pdf"']);
    for (const i of interactions) expect(i.account).toBe("acme");
  });

  it("asks for extracted .zip files instead of guessing", async () => {
    const { interactions, errors } = await parseFiles(
      [{ name: "slack-export.zip", data: new Uint8Array([80, 75]) }],
      "acme",
    );
    expect(interactions).toEqual([]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/extract/i);
    expect(errors[0]).toContain("slack-export.zip");
  });

  it("keeps going when one file fails", async () => {
    const { interactions, errors } = await parseFiles(
      [
        {
          name: "deal-acme/2026-07-15.json",
          data: new TextEncoder().encode("not json"),
        },
        await fixture("plain.eml"),
      ],
      "acme",
    );
    expect(interactions).toHaveLength(1);
    expect(interactions[0]!.source).toBe("eml");
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("2026-07-15.json");
  });

  it("audio without an LLM is an error, not a crash", async () => {
    const { interactions, errors } = await parseFiles(
      [{ name: "call.mp3", data: new Uint8Array([1]) }],
      "acme",
    );
    expect(interactions).toEqual([]);
    expect(errors).toEqual([
      "call.mp3: transcription needs a configured LLM; set one up first.",
    ]);
  });
});
