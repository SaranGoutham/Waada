import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseSlackExport } from "../src/ingest/slack-export.ts";
import type { FileInput } from "../src/models.ts";

const DIR = join(dirname(fileURLToPath(import.meta.url)), "fixtures", "ingest");

async function channelDay(name: string): Promise<FileInput> {
  return {
    name: `deal-acme/${name}`,
    data: new Uint8Array(await readFile(join(DIR, name))),
  };
}

describe("parseSlackExport", () => {
  it("collapses one channel-day into one Interaction", async () => {
    const [i] = await parseSlackExport(await channelDay("slack-day.json"), "acme");
    expect(i).toBeDefined();
    expect(i?.account).toBe("acme");
    expect(i?.sourceId).toBe("slack:deal-acme:2026-07-15");
    expect(i?.type).toBe("slack");
    expect(i?.source).toBe("slack_export");
    expect(i?.title).toBe("#deal-acme — 2026-07-15");
    expect(i?.date).toBe(new Date(1784106000 * 1000).toISOString());
    expect(i?.participants).toEqual(["Alex Rivera", "Bhavana Iyer", "U99MISSING"]);
    expect(i?.content).toContain("Alex Rivera: Discovery call done");
    expect(i?.content).toContain("U99MISSING: Requirements session");
    expect(i?.content).not.toContain("1784110000");
  });

  it("reads the channel from the file payload when the path has no folder", async () => {
    const raw = new TextEncoder().encode(
      JSON.stringify({
        channel: "deal-nova",
        messages: [
          {
            text: "Hello",
            ts: "1785000000.000100",
            user: "U01",
            user_profile: { real_name: "Sam" },
          },
        ],
      }),
    );
    const [i] = await parseSlackExport({ name: "2026-08-04.json", data: raw }, "nova");
    expect(i?.sourceId).toBe("slack:deal-nova:2026-08-04");
    expect(i?.title).toBe("#deal-nova — 2026-08-04");
  });

  it("throws a friendly error for non-JSON bodies", async () => {
    await expect(
      parseSlackExport(
        { name: "deal-acme/2026-07-15.json", data: new TextEncoder().encode("not json") },
        "acme",
      ),
    ).rejects.toThrow(/not valid Slack export JSON/);
  });
});
