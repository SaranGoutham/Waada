import { describe, expect, it } from "vitest";
import { commitmentLedger } from "../src/agent/index.ts";
import { mergeCommitments } from "../src/agent/ledger.ts";
import type { Commitment, Interaction } from "../src/models.ts";
import { FakeLLM, FakeMemory, sampleInteractions } from "./fakes.ts";

const DELIVERED: Commitment = {
  text: "Send annual pricing proposal",
  madeBy: "Alex Rivera",
  madeTo: "Priya Nair",
  date: "2026-08-13T10:00:00.000Z",
  dueDate: "2026-08-14T00:00:00.000Z",
  status: "delivered",
  evidence: "Delivered Aug 15 proposal email",
  source: "email — Pricing proposal",
};

const OPEN: Commitment = {
  text: "Send SOC 2 Type II report",
  madeBy: "Alex Rivera",
  madeTo: "Meenakshi Rao",
  date: "2026-09-02T15:30:00.000Z",
  dueDate: "2026-09-04T00:00:00.000Z",
  status: "open",
  evidence: "No later interaction shows delivery",
  source: "email — Security docs follow-up",
};

const OLDER_OPEN: Commitment = {
  ...OPEN,
  text: "Send implementation plan",
  date: "2026-08-01T10:00:00.000Z",
  dueDate: null,
};

const UNDATED_OPEN: Commitment = {
  ...OPEN,
  text: "Send deployment checklist",
  date: null,
  dueDate: null,
};

const UNCLEAR: Commitment = {
  text: "Loop in the onboarding lead",
  madeBy: "Alex Rivera",
  madeTo: "Priya Nair",
  date: "2026-09-18T10:00:00.000Z",
  dueDate: null,
  status: "unclear",
  evidence: "Conflicting later traces",
  source: "call — Go-live shift",
};

async function seededMemory(): Promise<FakeMemory> {
  const mem = new FakeMemory();
  for (const i of sampleInteractions()) await mem.remember(i);
  return mem;
}

function searchCalls(mem: FakeMemory): { query: string; opts: unknown }[] {
  return mem.calls
    .filter((c) => c.method === "search")
    .map((c) => ({ query: c.args[1] as string, opts: c.args[2] }));
}

describe("commitmentLedger", () => {
  it("recalls the four commitment query sets with a high budget", async () => {
    const mem = await seededMemory();
    const llm = new FakeLLM({ extract: { commitments: [{ commitments: [] }] } });
    await commitmentLedger("acme", { memory: mem, llm });
    const queries = searchCalls(mem).map((c) => c.query);
    expect(queries).toHaveLength(4);
    expect(queries.join(" ").toLowerCase()).toMatch(/promises our team made/);
    for (const c of searchCalls(mem)) expect(c.opts).toMatchObject({ budget: "high" });
  });

  it("sorts open overdue-first, then upcoming, then undated, then unclear, then delivered", async () => {
    const NOW = "2026-09-20T00:00:00.000Z";
    const overdueMost: Commitment = {
      ...OPEN,
      text: "Send SOC 2 Type II report",
      date: "2026-09-02T15:30:00.000Z",
      dueDate: "2026-09-04T00:00:00.000Z",
    };
    const overdueLess: Commitment = {
      ...OPEN,
      text: "Send pen-test summary",
      date: "2026-09-10T10:00:00.000Z",
      dueDate: "2026-09-12T00:00:00.000Z",
    };
    const dueNow: Commitment = {
      ...OPEN,
      text: "Confirm training dates",
      date: "2026-09-19T10:00:00.000Z",
      dueDate: NOW,
    };
    const upcomingSoon: Commitment = {
      ...OPEN,
      text: "Contact Priya Nair",
      date: "2026-09-25T10:00:00.000Z",
      dueDate: "2026-09-28T00:00:00.000Z",
    };
    const mem = await seededMemory();
    const llm = new FakeLLM({
      extract: {
        commitments: [
          {
            commitments: [
              DELIVERED,
              UNCLEAR,
              UNDATED_OPEN,
              OLDER_OPEN,
              upcomingSoon,
              dueNow,
              overdueLess,
              overdueMost,
            ],
          },
        ],
      },
    });
    const ledger = await commitmentLedger("acme", { memory: mem, llm }, NOW);
    expect(ledger.map((c) => c.text)).toEqual([
      overdueMost.text, // most overdue first
      overdueLess.text,
      dueNow.text, // due exactly now counts as upcoming, soonest first
      upcomingSoon.text,
      OLDER_OPEN.text, // undated: newest date first
      UNDATED_OPEN.text, // dateless last among undated
      UNCLEAR.text,
      DELIVERED.text,
    ]);
  });

  it("dedupes recalled hits by text before asking the model", async () => {
    const mem = await seededMemory();
    const first = sampleInteractions()[0];
    if (!first) throw new Error("sampleInteractions is empty");
    const dup = {
      ...first,
      sourceId: "file:duplicate00000001",
      date: "2026-09-03T10:00:00.000Z",
    };
    await mem.remember(dup);
    const llm = new FakeLLM({ extract: { commitments: [{ commitments: [] }] } });
    await commitmentLedger("acme", { memory: mem, llm });
    const extractCall = llm.calls.find((c) => c.method === "extract");
    if (!extractCall) throw new Error("expected an extract call");
    const user = (extractCall.args[0] as { user: string }).user;
    const occurrences = user.split("we will send the SOC 2 Type II report").length - 1;
    expect(occurrences).toBe(1);
  });

  it("returns [] when extract yields null", async () => {
    const mem = await seededMemory();
    const ledger = await commitmentLedger("acme", { memory: mem, llm: new FakeLLM() });
    expect(ledger).toEqual([]);
  });

  it("gives the extractor the v3 commitment and delivery rules", async () => {
    const mem = await seededMemory();
    const llm = new FakeLLM({ extract: { commitments: [{ commitments: [] }] } });
    await commitmentLedger("acme", { memory: mem, llm });
    const extractCall = llm.calls.find((c) => c.method === "extract");
    if (!extractCall) throw new Error("expected an extract call");
    const system = (extractCall.args[0] as { system: string }).system;
    expect(system).toMatch(/even if.*late/i);
    expect(system).toMatch(/ongoing habits, processes, and service levels.*not commitments/i);
    expect(system).toMatch(/merge promises for the same deliverable/i);
    expect(system).toMatch(/sent, shared, attached, returned/i);
    expect(system).toMatch(/no later interaction mentions it/i);
  });

  it("uses the provider default extraction temperature for the ledger", async () => {
    const mem = await seededMemory();
    const llm = new FakeLLM({ extract: { commitments: [{ commitments: [] }] } });
    await commitmentLedger("acme", { memory: mem, llm });
    const extractCall = llm.calls.find((c) => c.method === "extract");
    if (!extractCall) throw new Error("expected an extract call");
    expect((extractCall.args[0] as { temperature?: number }).temperature).toBeUndefined();
  });

  it("asks for a dueDate on every commitment (ledger v4)", async () => {
    const mem = await seededMemory();
    const llm = new FakeLLM({ extract: { commitments: [{ commitments: [] }] } });
    await commitmentLedger("acme", { memory: mem, llm });
    const extractCall = llm.calls.find((c) => c.method === "extract");
    if (!extractCall) throw new Error("expected an extract call");
    const system = (extractCall.args[0] as { system: string }).system;
    expect(system).toMatch(/dueDate/);
    expect(system).toMatch(/deadline/i);
    expect(system).toMatch(/null when no deadline/i);
  });
});

/** Big interactions matching every ledger recall query, so evidence spans chunks. */
function bigInteraction(n: number, contentChars: number): Interaction {
  // FakeMemory scores a recall by distinct shared words (top 10 per query),
  // so repetition cannot rank an item higher. Instead each interaction carries
  // every word of one query (topping that recall) plus one word from each of
  // the other three (still matching them): the union of the four recalls then
  // covers all interactions instead of the same ten.
  const bodies = [
    "commitments promises team made customer materials ups still",
    "documents proposals materials sent delivered team ups still",
    "follow ups owe customer team materials still",
    "things customer still waiting team materials ups",
  ];
  return {
    account: "acme",
    sourceId: `file:big${String(n).padStart(14, "0")}`,
    type: "call",
    date: `2026-09-${String((n % 27) + 1).padStart(2, "0")}T10:00:00.000Z`,
    title: `Big sync ${n}`,
    participants: ["Alex Rivera"],
    content: `${bodies[n % 4]} proposal UNIQUE-${n} ${"x".repeat(contentChars)}`,
    source: "transcript",
  };
}

async function bigMemory(count: number, contentChars: number): Promise<FakeMemory> {
  const mem = new FakeMemory();
  for (let n = 0; n < count; n++) await mem.remember(bigInteraction(n, contentChars));
  return mem;
}

function extractCalls(llm: FakeLLM): number {
  return llm.calls.filter((c) => c.method === "extract").length;
}

describe("commitmentLedger chunked pass", () => {
  it("keeps a single-mention promise found only in the last chunk", async () => {
    const mem = await bigMemory(6, 1400);
    const filler: Commitment = {
      text: "Send weekly status update",
      madeBy: "Alex Rivera",
      madeTo: "Priya Nair",
      date: "2026-08-01T10:00:00.000Z",
      dueDate: null,
      status: "open",
      evidence: "Mentioned in early chunks",
      source: "call — Big sync 0",
    };
    const soc2: Commitment = {
      text: "Send SOC 2 Type II report",
      madeBy: "Alex Rivera",
      madeTo: "David Chen",
      date: "2026-09-02T15:30:00.000Z",
      dueDate: "2026-09-04T00:00:00.000Z",
      status: "open",
      evidence: "Promised once in the last chunk; no later interaction mentions it",
      source: "call — Big sync 5",
    };
    const llm = new FakeLLM({
      extract: { commitments: [{ commitments: [filler] }, { commitments: [soc2] }] },
    });
    const ledger = await commitmentLedger("acme", { memory: mem, llm });
    expect(extractCalls(llm)).toBe(2);
    expect(ledger.map((c) => c.text)).toContain(soc2.text);
    expect(ledger[0]?.text).toBe(soc2.text);
  });

  it("caps the pass at four chunks and still merges what was seen", async () => {
    const mem = await bigMemory(24, 1500);
    const llm = new FakeLLM({
      extract: {
        commitments: [
          { commitments: [] },
          { commitments: [] },
          { commitments: [] },
          {
            commitments: [
              {
                text: "Send SOC 2 Type II report",
                madeBy: "Alex Rivera",
                madeTo: "David Chen",
                date: "2026-09-02T15:30:00.000Z",
                dueDate: "2026-09-04T00:00:00.000Z",
                status: "open",
                evidence: "Promised once; no later interaction mentions it",
                source: "call — Big sync 20",
              },
            ],
          },
        ],
      },
    });
    const ledger = await commitmentLedger("acme", { memory: mem, llm });
    expect(extractCalls(llm)).toBe(4);
    expect(ledger.map((c) => c.text)).toEqual(["Send SOC 2 Type II report"]);
  });
});

describe("mergeCommitments", () => {
  const open: Commitment = {
    text: "Send SOC 2 Type II report",
    madeBy: "Alex Rivera",
    madeTo: "David Chen",
    date: "2026-09-02T15:30:00.000Z",
    dueDate: null,
    status: "open",
    evidence: "First chunk saw the promise",
    source: "call — A",
  };

  it("dedupes the same deliverable ignoring case, spacing and punctuation", () => {
    const dup: Commitment = {
      ...open,
      text: "  send  SOC 2 type II  report! ",
      evidence: "Second chunk saw it rephrased",
      source: "call — B",
    };
    expect(mergeCommitments([open, dup])).toEqual([open]);
  });

  it("treats different recipients as different commitments", () => {
    const other: Commitment = { ...open, madeTo: "Priya Nair" };
    expect(mergeCommitments([open, other])).toEqual([open, other]);
  });

  it("marks the deliverable delivered when any chunk shows delivery", () => {
    const delivered: Commitment = {
      ...open,
      status: "delivered",
      evidence: "Later chunk saw the report attached",
      source: "email — C",
    };
    const merged = mergeCommitments([open, delivered]);
    expect(merged).toHaveLength(1);
    expect(merged[0]?.status).toBe("delivered");
    expect(merged[0]?.evidence).toMatch(/attached/);
  });

  it("backfills a missing dueDate from the duplicate", () => {
    const dated: Commitment = { ...open, dueDate: "2026-09-04T00:00:00.000Z" };
    const merged = mergeCommitments([open, dated]);
    expect(merged).toHaveLength(1);
    expect(merged[0]?.dueDate).toBe("2026-09-04T00:00:00.000Z");
  });
});
