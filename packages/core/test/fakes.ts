// Test doubles for the Memory and LLM contracts (AGENTS.md §6.4, §6.5). No network.
// Other packages import them from "@waada/core/testing".
import type { z } from "zod";
import { bankIdFor } from "../src/config.ts";
import type { LLM } from "../src/llm/index.ts";
import type { Memory } from "../src/memory/index.ts";
import type { Interaction, MemoryHit } from "../src/models.ts";

export type FakeCall = { method: string; args: unknown[] };

const STOPWORDS = new Set(
  "a an and are as at be by did do does for from has have how i in is it of on or our so that the this to us was we what when where which who why will with you your".split(
    " ",
  ),
);

function words(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w !== "" && !STOPWORDS.has(w)),
  );
}

/** In-process memory: one bank per account, keyed by sourceId. Search ranks by shared words. */
export class FakeMemory implements Memory {
  static readonly DEFAULT_REFLECTION = "FakeMemory reflection: no real patterns learned.";
  readonly calls: FakeCall[] = [];
  private readonly banks = new Map<string, Map<string, Interaction>>();
  private readonly reflectAnswer: string;

  constructor(opts: { reflectAnswer?: string } = {}) {
    this.reflectAnswer = opts.reflectAnswer ?? FakeMemory.DEFAULT_REFLECTION;
  }

  private bank(account: string): Map<string, Interaction> {
    let bank = this.banks.get(account);
    if (!bank) {
      bank = new Map();
      this.banks.set(account, bank);
    }
    return bank;
  }

  async ensureBank(account: string): Promise<string> {
    this.calls.push({ method: "ensureBank", args: [account] });
    this.bank(account);
    return bankIdFor(account);
  }

  async remember(i: Interaction): Promise<void> {
    this.calls.push({ method: "remember", args: [i] });
    this.bank(i.account).set(i.sourceId, i);
  }

  async search(
    account: string,
    query: string,
    opts?: { budget?: "low" | "mid" | "high"; maxResults?: number },
  ): Promise<MemoryHit[]> {
    this.calls.push({ method: "search", args: [account, query, opts] });
    const q = words(query);
    return [...(this.banks.get(account)?.values() ?? [])]
      .map((i) => {
        const doc = words(`${i.title} ${i.content}`);
        return { i, score: [...q].filter((w) => doc.has(w)).length };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score || b.i.date.localeCompare(a.i.date))
      .slice(0, opts?.maxResults ?? 10)
      .map(({ i }) => ({
        text: i.content,
        date: i.date,
        context: `${i.type} — ${i.title}`,
        documentId: i.sourceId,
      }));
  }

  async reflect(account: string, query: string): Promise<string> {
    this.calls.push({ method: "reflect", args: [account, query] });
    return this.reflectAnswer;
  }

  async deleteBank(account: string): Promise<void> {
    this.calls.push({ method: "deleteBank", args: [account] });
    this.banks.delete(account);
  }
}

/**
 * Scripted LLM. `chat` replies are returned in order; `extract` values are queued per `name` and
 * validated with the call's schema (invalid or empty queue → null, like the real extract).
 * `chat` and `transcribe` must return strings, so they throw when nothing is configured.
 */
export class FakeLLM implements LLM {
  readonly calls: FakeCall[] = [];
  private readonly chatQueue: string[];
  private readonly extractQueues: Record<string, unknown[]>;
  private readonly transcript: string | undefined;

  constructor(
    opts: { chat?: string[]; extract?: Record<string, unknown[]>; transcribe?: string } = {},
  ) {
    this.chatQueue = [...(opts.chat ?? [])];
    this.extractQueues = Object.fromEntries(
      Object.entries(opts.extract ?? {}).map(([name, values]) => [name, [...values]]),
    );
    this.transcript = opts.transcribe;
  }

  async chat(a: { system: string; user: string; temperature?: number }): Promise<string> {
    this.calls.push({ method: "chat", args: [a] });
    const reply = this.chatQueue.shift();
    if (reply === undefined) throw new Error("FakeLLM: no chat reply queued");
    return reply;
  }

  async extract<T>(a: {
    system: string;
    user: string;
    schema: z.ZodType<T>;
    name: string;
    description: string;
    temperature?: number;
  }): Promise<T | null> {
    this.calls.push({ method: "extract", args: [a] });
    const queue = this.extractQueues[a.name];
    if (!queue || queue.length === 0) return null;
    const parsed = a.schema.safeParse(queue.shift());
    return parsed.success ? parsed.data : null;
  }

  async transcribe(audio: Uint8Array, filename: string): Promise<string> {
    this.calls.push({ method: "transcribe", args: [audio, filename] });
    if (this.transcript === undefined) throw new Error("FakeLLM: no transcription configured");
    return this.transcript;
  }
}

/** Three hand-written interactions for account "acme": an email, a call and a Slack day. */
export function sampleInteractions(): Interaction[] {
  return [
    {
      account: "acme",
      sourceId: "<soc2-followup@acme.example>",
      type: "email",
      date: "2026-09-02T15:30:00.000Z",
      title: "Security docs follow-up",
      participants: ["alex.rivera@waada.example", "meenakshi.rao@acme.example"],
      content:
        "Hi Meenakshi, following up on the security review: we will send the SOC 2 Type II report by Friday, Sep 12. The report is due before your procurement deadline. — Alex",
      source: "eml",
    },
    {
      account: "acme",
      sourceId: "file:3f9a1c0d2b7e4a51",
      type: "call",
      date: "2026-08-20T10:00:00.000Z",
      title: "Call #2 — pricing discussion",
      participants: ["Alex Rivera", "Meenakshi Rao", "Bhavana Iyer"],
      content:
        "Bhavana pushed for monthly pricing. After discussion Acme accepted annual billing with an 8% discount. Alex agreed to put the discount in writing in the order form.",
      source: "transcript",
    },
    {
      account: "acme",
      sourceId: "slack:C01ACME:2026-09-05",
      type: "slack",
      date: "2026-09-05T09:12:00.000Z",
      title: "#acme-deal — Sep 5",
      participants: ["alex.rivera", "bhavana.iyer"],
      content:
        "bhavana.iyer: Legal approved the DPA redlines.\nalex.rivera: Great. Still waiting on the SOC 2 report from compliance.",
      source: "slack_api",
    },
  ];
}
