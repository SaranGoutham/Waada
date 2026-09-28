import type { Answer, Brief, Commitment, Landmine } from "@waada/core";

const commitment: Commitment = {
  text: "Send the SOC 2 Type II report by Friday, Sep 12.",
  madeBy: "Alex Rivera",
  madeTo: "Meenakshi Rao",
  date: "2026-09-02T15:30:00.000Z",
  dueDate: "2026-09-12T23:59:59.000Z",
  status: "open",
  evidence: "Alex promised the report before Acme's procurement deadline.",
  source: "Security docs follow-up — Sep 2",
};

const landmine: Landmine = {
  topic: "Monthly pricing",
  whatHappened: "Acme pushed for monthly pricing during the Aug 20 pricing discussion.",
  resolution: "Acme accepted annual billing with an 8% discount.",
  date: "2026-08-20T10:00:00.000Z",
  guidance:
    "Do not re-open monthly pricing; carry the agreed annual structure into the order form.",
  source: "Call #2 — pricing discussion",
};

export function fakeBrief(account: string): Brief {
  return {
    account,
    commitments: [commitment],
    landmines: [landmine],
    markdown:
      "## Account handoff\n\nAcme is in procurement. The immediate risk is the outstanding SOC 2 delivery. Preserve the annual-billing agreement and 8% discount.",
  };
}

export function fakeAnswer(question: string): Answer {
  const changed = /changed|july/i.test(question);
  return {
    text: changed
      ? "The timeline moved from a Q3 target to Q4 after Acme's security and procurement review."
      : "Our open promise is to send Acme the SOC 2 Type II report by Sep 12.",
    citations: changed
      ? ["Acme timeline — Aug 20", "Security docs follow-up — Sep 2"]
      : [commitment.source],
  };
}

export function fakeCompare() {
  return {
    crm: "CRM-only view\n\nStage: Procurement\nTarget close: Q4",
    summary: "Summary-only view\n\nAcme discussed security, procurement, and pricing.",
    waada:
      "Waada view\n\nOpen commitment: send the SOC 2 Type II report by Sep 12. Do not re-open monthly pricing; Acme accepted annual billing with an 8% discount.",
  };
}
