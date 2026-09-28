// Transcript parser (M03): front-matter header → metadata directly,
// otherwise llm.extract over the first ~2,000 characters, otherwise
// filename + current time with a warning. Also handles .vtt cue files.
import { z } from "zod";
import type { LLM } from "../llm/index.ts";
import { createLogger } from "../log.ts";
import { type FileInput, type Interaction, InteractionType } from "../models.ts";
import { fileHash } from "./eml.ts";

const TranscriptMeta = z.object({
  date: z.string().datetime(),
  title: z.string().min(1),
  participants: z.array(z.string()),
  type: InteractionType,
});
type TranscriptMeta = z.infer<typeof TranscriptMeta>;
// Every key required but nullable: Groq's strict structured output rejects
// schemas with optional keys (HTTP 400 "`required` … every key in properties").
export const TranscriptMetaExtract = z.object({
  date: z.string().datetime().nullable(),
  title: z.string().min(1).nullable(),
  participants: z.array(z.string()),
  type: InteractionType.nullable(),
});
type TranscriptMetaPartial = Partial<{ [K in keyof TranscriptMeta]: TranscriptMeta[K] | null }>;
const log = createLogger("ingest");

export type TranscriptResult = {
  interactions: Interaction[];
  warnings: string[];
};

function baseName(name: string): string {
  const slash = Math.max(name.lastIndexOf("/"), name.lastIndexOf("\\"));
  const file = slash >= 0 ? name.slice(slash + 1) : name;
  return file.replace(/\.[^.]+$/, "");
}

/** Parses the `---\nkey: value\n---` header by hand (`key: value` lines only). */
function parseFrontMatter(text: string): { meta: Partial<TranscriptMeta>; body: string } | null {
  const lines = text.split("\n");
  if (lines[0]?.trim() !== "---") return null;
  let end = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i]?.trim() === "---") {
      end = i;
      break;
    }
  }
  if (end < 0) return null;
  const fields: Record<string, string> = {};
  for (const line of lines.slice(1, end)) {
    const at = line.indexOf(":");
    if (at <= 0) continue;
    fields[line.slice(0, at).trim().toLowerCase()] = line.slice(at + 1).trim();
  }
  const meta: Partial<TranscriptMeta> = {};
  if (fields.title) meta.title = fields.title;
  if (fields.date && !Number.isNaN(Date.parse(fields.date))) {
    meta.date = new Date(fields.date).toISOString();
  }
  if (fields.type) {
    const t = InteractionType.safeParse(fields.type);
    meta.type = t.success ? t.data : "call";
  }
  if (fields.participants) {
    meta.participants = fields.participants
      .split(",")
      .map((p) => p.trim())
      .filter((p) => p !== "");
  }
  return {
    meta,
    body: lines
      .slice(end + 1)
      .join("\n")
      .trim(),
  };
}

/** Strips the WEBVTT header and cue timings; keeps `<v Speaker>` names as prefixes. */
function vttToText(text: string): string {
  const out: string[] = [];
  let first = true;
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (first) {
      first = false;
      if (line.startsWith("WEBVTT")) continue;
    }
    if (line === "" || line === "WEBVTT") continue;
    if (line.startsWith("NOTE")) continue;
    if (line.includes("-->")) continue;
    if (/^\d+$/.test(line)) continue;
    const voice =
      /^<v\s+([^>]+)>([\s\S]*)<\/v>\s*$/.exec(line) ?? /^<v\s+([^>]+)>([\s\S]*)$/.exec(line);
    if (voice) {
      const speaker = voice[1]?.trim() || "unknown";
      const rest = (voice[2] ?? "").replace(/<[^>]*>/g, "").trim();
      out.push(`${speaker}: ${rest}`);
    } else {
      out.push(line.replace(/<[^>]*>/g, "").trim());
    }
  }
  return out.filter((l) => l !== "" && l !== ":").join("\n");
}

export async function parseTranscript(
  file: FileInput,
  account: string,
  deps?: { llm?: LLM },
): Promise<TranscriptResult> {
  const rawText = new TextDecoder().decode(file.data);
  const text = file.name.toLowerCase().endsWith(".vtt") ? vttToText(rawText) : rawText;
  const header = parseFrontMatter(text);
  let meta: TranscriptMetaPartial | null = null;
  let body = text.trim();
  if (header?.meta.title && header.meta.date) {
    meta = {
      date: header.meta.date,
      title: header.meta.title,
      participants: header.meta.participants ?? [],
      type: header.meta.type ?? "call",
    };
    body = header.body;
  } else {
    const extracted = await deps?.llm?.extract({
      system: [
        "Extract meeting metadata as JSON with keys date (UTC ISO-8601), title, participants (names), type (call, meeting, email, slack or note).",
        `Today is ${new Date().toISOString().slice(0, 10)}. If the transcript names a month and day but no year, use the most recent year in which that date is not after today. Use null for date only if no day is mentioned.`,
      ].join("\n"),
      user: text.slice(0, 2000),
      schema: TranscriptMetaExtract,
      name: "transcript-metadata",
      description: "Date, title, participants and type of a sales transcript",
    });
    if (extracted) {
      meta = extracted;
    } else {
      log.warn("transcript metadata extraction did not return valid metadata", {
        file: file.name,
        reason: deps?.llm ? "no-valid-result" : "no-llm-configured",
      });
    }
  }
  const warnings: string[] = [];
  const resolved: TranscriptMeta = {
    date: meta?.date ?? new Date().toISOString(),
    title: meta?.title ?? baseName(file.name),
    participants: meta?.participants ?? [],
    type: meta?.type ?? "call",
  };
  if (!meta?.date || !meta.title) {
    warnings.push(
      `${file.name}: no header and metadata extraction was incomplete; used available values and file-name/current-time fallbacks.`,
    );
  }
  return {
    interactions: [
      {
        account,
        sourceId: `file:${fileHash(file.data)}`,
        type: resolved.type,
        date: resolved.date,
        title: resolved.title,
        participants: resolved.participants,
        content: body,
        source: "transcript",
      },
    ],
    warnings,
  };
}
