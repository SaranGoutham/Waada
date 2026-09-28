import { describe, expect, it } from "vitest";
import { commitmentRow, importPreviewRow } from "./format";

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
