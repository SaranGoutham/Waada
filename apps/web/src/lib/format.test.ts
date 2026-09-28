import { describe, expect, it } from "vitest";
import { briefSections, commitmentRow, importPreviewRow, sourceDisplay } from "./format";

describe("display rows", () => {
  it("keeps an open commitment's source and people visible", () => {
    expect(
      commitmentRow({
        text: "Send SOC 2",
        madeBy: "Alex",
        madeTo: "Meenakshi",
        date: "2026-09-02T15:30:00.000Z",
        dueDate: null,
        status: "open",
        evidence: "Promised",
        source: "Sep 2 email",
      }),
    ).toMatchObject({ status: "open", people: "Alex → Meenakshi", source: "Sep 2 email" });
  });
  it("joins import-preview participants", () => {
    expect(
      importPreviewRow({
        account: "acme",
        sourceId: "id",
        type: "email",
        date: "2026-09-02T15:30:00.000Z",
        title: "Security docs",
        participants: ["Alex", "Meenakshi"],
        content: "",
        source: "eml",
      }).participants,
    ).toBe("Alex, Meenakshi");
  });
});

describe("brief sections", () => {
  it("splits conventional Markdown headings", () => {
    expect(briefSections("## People\n\nAsha\n\n## Deal story\n\nIn procurement")).toEqual({
      people: "Asha",
      "deal story": "In procurement",
    });
  });
  it("splits plain, bold, and colon-ended headings without case sensitivity", () => {
    expect(
      briefSections(
        "open commitments\nPromise\n\n**LANDMINES**\nPricing\n\nRecent Changes:\nMoved to Q4",
      ),
    ).toEqual({
      "open commitments": "Promise",
      landmines: "Pricing",
      "recent changes": "Moved to Q4",
    });
  });
});

describe("source display", () => {
  it("turns raw timestamped Slack context into a short source", () => {
    expect(sourceDisplay("2026-09-19T00:00:00.020Z (slack — renewal thread)")).toEqual({
      date: "Sep 19, 2026",
      type: "slack",
      title: "renewal thread",
    });
  });
  it("handles bracketed timestamps", () => {
    expect(sourceDisplay("[2026-08-12T09:00:00.010Z] Call — security review")).toEqual({
      date: "Aug 12, 2026",
      type: "call",
      title: "security review",
    });
  });
});
