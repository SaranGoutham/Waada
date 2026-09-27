import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ingest } from "../src/ingest/pipeline.ts";
import type { Interaction } from "../src/models.ts";
import { FakeMemory, sampleInteractions } from "./fakes.ts";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "waada-ingest-"));
  vi.stubEnv("WAADA_DATA_DIR", dir);
});

afterEach(async () => {
  vi.unstubAllEnvs();
  await rm(dir, { recursive: true, force: true });
});

function rememberDates(mem: FakeMemory): string[] {
  return mem.calls
    .filter((c) => c.method === "remember")
    .map((c) => (c.args[0] as Interaction).date);
}

describe("ingest pipeline", () => {
  it("stores items in date order and dedupes on rerun", async () => {
    const mem = new FakeMemory();
    const items = [...sampleInteractions()].reverse();
    const first = await ingest(items, { memory: mem });
    expect(first).toEqual({ added: 3, skipped: 0, errors: [] });
    expect(rememberDates(mem)).toEqual([...sampleInteractions()].map((i) => i.date).sort());
    expect(mem.calls.filter((c) => c.method === "ensureBank")).toHaveLength(1);

    const second = await ingest(sampleInteractions(), { memory: mem });
    expect(second).toEqual({ added: 0, skipped: 3, errors: [] });
    expect(rememberDates(mem)).toHaveLength(3);
  });

  it("records one error per failing item and continues with the rest", async () => {
    const mem = new FakeMemory();
    const [first, second] = sampleInteractions() as [Interaction, Interaction, Interaction];
    const bad = { ...first, date: "not-a-date" };
    const report = await ingest([bad, second], { memory: mem });
    expect(report.added).toBe(1);
    expect(report.skipped).toBe(0);
    expect(report.errors).toHaveLength(1);
    expect(report.errors[0]).toContain(first.sourceId);
    expect(rememberDates(mem)).toEqual([second.date]);
  });

  it("keeps per-account manifests separate", async () => {
    const mem = new FakeMemory();
    const [first] = sampleInteractions() as [Interaction, Interaction, Interaction];
    await ingest([first], { memory: mem });
    const rerun = await ingest([{ ...first, account: "globex" }], { memory: mem });
    expect(rerun).toEqual({ added: 1, skipped: 0, errors: [] });
  });
});
