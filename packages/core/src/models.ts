// Cross-module types (AGENTS.md §6.1). Zod schemas are the single definition; TS types via z.infer.
import { z } from "zod";

export const InteractionType = z.enum(["call", "email", "slack", "meeting", "note"]);
export type InteractionType = z.infer<typeof InteractionType>;

export const CommitmentStatus = z.enum(["open", "delivered", "unclear"]);
export type CommitmentStatus = z.infer<typeof CommitmentStatus>;

export const Interaction = z.object({
  account: z.string(), // slug, e.g. "acme"
  sourceId: z.string(), // stable id → Hindsight document_id: Message-ID | "slack:<channel>:<YYYY-MM-DD>" | "file:<sha256 first 16>" | "meet:<meetingId>" | "hubspot:<engagementId>"
  type: InteractionType,
  date: z.string().datetime(), // real time of the interaction, UTC ISO
  title: z.string(), // "Call #2 — pricing discussion"
  participants: z.array(z.string()),
  content: z.string(),
  source: z.enum([
    "eml",
    "slack_export",
    "transcript",
    "audio",
    "gmail",
    "slack_api",
    "hubspot",
    "meet",
  ]),
});
export type Interaction = z.infer<typeof Interaction>;

export const MemoryHit = z.object({
  text: z.string(),
  date: z.string().datetime().nullable(),
  context: z.string().nullable(), // "email — Security docs follow-up"
  documentId: z.string().nullable(),
});
export type MemoryHit = z.infer<typeof MemoryHit>;

// A promise our team made ("Promise" would clash with JS Promise).
export const Commitment = z.object({
  text: z.string(), // "Send SOC 2 Type II report"
  madeBy: z.string(),
  madeTo: z.string(),
  date: z.string().datetime().nullable(),
  // Deadline stated in the promise itself (null when none was stated).
  // Required-but-nullable: Groq strict structured output rejects optional keys (P-009).
  dueDate: z.string().datetime().nullable(),
  status: CommitmentStatus,
  evidence: z.string(), // why this status, citing the source
  source: z.string(), // "Call #4 — Sep 2"
});
export type Commitment = z.infer<typeof Commitment>;

export const Landmine = z.object({
  topic: z.string(), // "Monthly pricing"
  whatHappened: z.string(),
  resolution: z.string(),
  date: z.string().datetime().nullable(),
  guidance: z.string(), // "Do NOT re-open; annual billing + 8% was accepted"
  source: z.string(),
});
export type Landmine = z.infer<typeof Landmine>;

export const Answer = z.object({ text: z.string(), citations: z.array(z.string()) });
export type Answer = z.infer<typeof Answer>;

export const Brief = z.object({
  account: z.string(),
  markdown: z.string(),
  commitments: z.array(Commitment),
  landmines: z.array(Landmine),
});
export type Brief = z.infer<typeof Brief>;

export const IngestReport = z.object({
  added: z.number().int(),
  skipped: z.number().int(), // already ingested (dedupe)
  errors: z.array(z.string()),
});
export type IngestReport = z.infer<typeof IngestReport>;

export const FileInput = z.object({ name: z.string(), data: z.instanceof(Uint8Array) });
export type FileInput = z.infer<typeof FileInput>;
