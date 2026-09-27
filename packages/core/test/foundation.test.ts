import { describe, expect, it } from "vitest";
import { ConfigError, ExternalServiceError, WaadaError } from "../src/errors.ts";
import {
  Answer,
  Brief,
  Commitment,
  FileInput,
  IngestReport,
  Interaction,
  Landmine,
  MemoryHit,
} from "../src/models.ts";

const validInteraction = {
  account: "acme",
  sourceId: "<abc@mail.acme.com>",
  type: "email",
  date: "2026-09-02T14:00:00Z",
  title: "Security docs follow-up",
  participants: ["dana@acme.com", "sam@waada.dev"],
  content: "We will send the SOC 2 Type II report by Friday.",
  source: "eml",
} as const;

describe("models", () => {
  it("accepts a valid Interaction", () => {
    expect(Interaction.parse(validInteraction)).toEqual(validInteraction);
  });

  it("rejects an Interaction with a bad type, non-ISO date, or missing sourceId", () => {
    expect(Interaction.safeParse({ ...validInteraction, type: "fax" }).success).toBe(false);
    expect(Interaction.safeParse({ ...validInteraction, date: "2 Sep 2026" }).success).toBe(false);
    expect(Interaction.safeParse({ ...validInteraction, source: "pdf" }).success).toBe(false);
    const { sourceId: _omit, ...noSourceId } = validInteraction;
    expect(Interaction.safeParse(noSourceId).success).toBe(false);
  });

  it("validates Commitment status and nullable dates", () => {
    const c = {
      text: "Send SOC 2 Type II report",
      madeBy: "Sam",
      madeTo: "Dana",
      date: null,
      status: "open",
      evidence: "No later email contains the report",
      source: "Call #4 — Sep 2",
    };
    expect(Commitment.parse(c)).toEqual(c);
    expect(Commitment.safeParse({ ...c, status: "done" }).success).toBe(false);
  });

  it("parses Landmine, MemoryHit, Answer, Brief and IngestReport", () => {
    const landmine = {
      topic: "Monthly pricing",
      whatHappened: "Buyer pushed for monthly billing",
      resolution: "Annual billing + 8% discount accepted",
      date: "2026-08-20T10:00:00Z",
      guidance: "Do NOT re-open",
      source: "Call #2",
    };
    expect(Landmine.parse(landmine)).toEqual(landmine);
    expect(MemoryHit.parse({ text: "t", date: null, context: null, documentId: null }).text).toBe(
      "t",
    );
    expect(Answer.parse({ text: "a", citations: ["Call #2"] }).citations).toEqual(["Call #2"]);
    expect(
      Brief.parse({ account: "acme", markdown: "# Acme", commitments: [], landmines: [landmine] })
        .landmines,
    ).toHaveLength(1);
    expect(IngestReport.safeParse({ added: 1.5, skipped: 0, errors: [] }).success).toBe(false);
  });

  it("FileInput accepts Uint8Array data and rejects strings", () => {
    expect(FileInput.safeParse({ name: "a.eml", data: new Uint8Array([1, 2]) }).success).toBe(true);
    expect(FileInput.safeParse({ name: "a.eml", data: "abc" }).success).toBe(false);
  });
});

describe("errors", () => {
  it("subclasses WaadaError and keeps a readable name", () => {
    const e = new ConfigError("Missing HINDSIGHT_BASE_URL");
    expect(e).toBeInstanceOf(WaadaError);
    expect(e).toBeInstanceOf(Error);
    expect(e.name).toBe("ConfigError");
    expect(e.message).toBe("Missing HINDSIGHT_BASE_URL");
    expect(new ExternalServiceError("x")).toBeInstanceOf(WaadaError);
    expect(new WaadaError("x").name).toBe("WaadaError");
  });
});
