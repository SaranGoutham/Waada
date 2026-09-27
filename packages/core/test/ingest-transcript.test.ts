import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseTranscript } from "../src/ingest/transcript.ts";
import type { FileInput } from "../src/models.ts";
import { FakeLLM } from "./fakes.ts";

const DIR = join(dirname(fileURLToPath(import.meta.url)), "fixtures", "ingest");

async function fixture(name: string): Promise<FileInput> {
  return { name, data: new Uint8Array(await readFile(join(DIR, name))) };
}

function hashOf(data: Uint8Array): string {
  return createHash("sha256").update(data).digest("hex").slice(0, 16);
}

const META = {
  date: "2026-08-20T10:00:00.000Z",
  title: "Pilot scoping session",
  participants: ["Priya Nair", "Alex Rivera"],
  type: "call",
} as const;

describe("parseTranscript", () => {
  it("uses front-matter directly", async () => {
    const file = await fixture("with-header.txt");
    const { interactions, warnings } = await parseTranscript(file, "acme", {
      llm: new FakeLLM(),
    });
    expect(warnings).toEqual([]);
    const [i] = interactions;
    expect(i!.sourceId).toBe(`file:${hashOf(file.data)}`);
    expect(i!.type).toBe("call");
    expect(i!.source).toBe("transcript");
    expect(i!.date).toBe("2026-08-12T15:00:00.000Z");
    expect(i!.title).toBe("Call #2 — pricing discussion");
    expect(i!.participants).toEqual(["Priya Nair", "Alex Rivera"]);
    expect(i!.content).toContain("8% discount");
    expect(i!.content).not.toContain("title:");
  });

  it("falls back to llm.extract when there is no header", async () => {
    const llm = new FakeLLM({ extract: { "transcript-metadata": [{ ...META }] } });
    const { interactions, warnings } = await parseTranscript(
      await fixture("no-header.txt"),
      "acme",
      { llm },
    );
    expect(warnings).toEqual([]);
    expect(interactions[0]!.title).toBe("Pilot scoping session");
    expect(interactions[0]!.participants).toEqual(["Priya Nair", "Alex Rivera"]);
    expect(interactions[0]!.content).toContain("forty seats");
    expect(llm.calls.filter((c) => c.method === "extract")).toHaveLength(1);
  });

  it("uses filename plus now with a warning when extraction returns null", async () => {
    const before = Date.now();
    const { interactions, warnings } = await parseTranscript(
      await fixture("no-header.txt"),
      "acme",
      { llm: new FakeLLM() },
    );
    expect(interactions[0]!.title).toBe("no-header");
    expect(Date.parse(interactions[0]!.date)).toBeGreaterThanOrEqual(before);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("no-header.txt");
  });

  it("strips WEBVTT cues to Speaker lines", async () => {
    const llm = new FakeLLM({ extract: { "transcript-metadata": [{ ...META }] } });
    const { interactions } = await parseTranscript(await fixture("sample.vtt"), "acme", {
      llm,
    });
    const content = interactions[0]!.content;
    expect(content).toContain("Alex Rivera: Hi Priya");
    expect(content).toContain("Priya Nair: Honestly?");
    expect(content).not.toContain("WEBVTT");
    expect(content).not.toContain("-->");
    expect(content).not.toContain("NOTE");
  });

  it("accepts .md files the same way", async () => {
    const file = await fixture("with-header.txt");
    const { interactions } = await parseTranscript(
      { name: "notes.md", data: file.data },
      "acme",
      { llm: new FakeLLM() },
    );
    expect(interactions[0]!.title).toBe("Call #2 — pricing discussion");
  });
});
