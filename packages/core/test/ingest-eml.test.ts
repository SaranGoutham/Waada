import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseEml } from "../src/ingest/eml.ts";
import type { FileInput } from "../src/models.ts";

const DIR = join(dirname(fileURLToPath(import.meta.url)), "fixtures", "ingest");

async function fixture(name: string): Promise<FileInput> {
  return { name, data: new Uint8Array(await readFile(join(DIR, name))) };
}

describe("parseEml", () => {
  it("parses headers and strips quoted replies", async () => {
    const [i] = await parseEml(await fixture("plain.eml"), "acme");
    expect(i).toBeDefined();
    expect(i?.account).toBe("acme");
    expect(i?.type).toBe("email");
    expect(i?.source).toBe("eml");
    expect(i?.sourceId).toBe("<plain-1@example.com>");
    expect(i?.date).toBe(new Date("Tue, 14 Jul 2026 10:30:00 +0000").toISOString());
    expect(i?.title).toBe("Intro + finding 30 minutes this week");
    expect(i?.participants).toEqual(["Alex Rivera", "Priya Nair", "David Chen"]);
    expect(i?.content).toContain("ops roundtable");
    expect(i?.content).not.toContain("Thursday morning works");
    expect(i?.content).not.toContain(">");
  });

  it("falls back to HTML text when there is no text part", async () => {
    const [i] = await parseEml(await fixture("html-only.eml"), "acme");
    expect(i?.sourceId).toBe("<html-only-1@example.com>");
    expect(i?.participants).toEqual(["Priya Nair", "Alex Rivera"]);
    expect(i?.content).toContain("Thursday morning works");
    expect(i?.content).not.toContain("On Tue, Jul 14, 2026");
    expect(i?.content.length).toBeGreaterThan(20);
  });

  it("falls back to file:<hash> when Message-ID is missing", async () => {
    const raw = new TextEncoder().encode(
      "Date: Tue, 14 Jul 2026 10:30:00 +0000\nFrom: a@example.com\nTo: b@example.com\nSubject: No ID\nContent-Type: text/plain\n\nHello there",
    );
    const [i] = await parseEml({ name: "noid.eml", data: raw }, "acme");
    const hash = createHash("sha256").update(raw).digest("hex").slice(0, 16);
    expect(i?.sourceId).toBe(`file:${hash}`);
    expect(i?.title).toBe("No ID");
  });

  it("throws a friendly error when the Date header is missing", async () => {
    const raw = new TextEncoder().encode(
      "Message-ID: <nodate@example.com>\nFrom: a@example.com\nSubject: No date\nContent-Type: text/plain\n\nHi",
    );
    await expect(parseEml({ name: "nodate.eml", data: raw }, "acme")).rejects.toThrow(
      /no parseable Date header/,
    );
  });
});
