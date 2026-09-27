// .eml parser (M03): Message-ID → sourceId, Date header → UTC ISO,
// From/To/Cc display names → participants, Subject → title.
import { createHash } from "node:crypto";
import PostalMime, { type Address } from "postal-mime";
import { WaadaError } from "../errors.ts";
import type { FileInput, Interaction } from "../models.ts";

export function fileHash(data: Uint8Array): string {
  return createHash("sha256").update(data).digest("hex").slice(0, 16);
}

function displayName(a: Address): string {
  if (a.address !== undefined) return a.name !== "" ? a.name : a.address;
  const member = a.group.find((m) => m.name !== "" || m.address !== "");
  return member ? (member.name !== "" ? member.name : member.address) : a.name;
}

function stripQuotedReplies(text: string): string {
  const lines = text.split(/\r?\n/);
  const kept: string[] = [];
  for (const line of lines) {
    if (/^\s*>/.test(line)) continue;
    if (/^On .*wrote:\s*$/.test(line.trim())) break;
    kept.push(line);
  }
  return kept.join("\n").replace(/[ \t]+\n/g, "\n").trim();
}

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  mdash: "—",
  ndash: "–",
  hellip: "…",
  rsquo: "'",
  lsquo: "'",
  rdquo: '"',
  ldquo: '"',
};

function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n: string) => String.fromCodePoint(Number.parseInt(n, 16)))
    .replace(/&([a-zA-Z]+);/g, (m, n: string) => ENTITIES[n] ?? m);
}

function htmlToText(html: string): string {
  const noStyle = html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ");
  const withBreaks = noStyle
    .replace(/<(br|p|div|li|tr|h[1-6])[^>]*>/gi, "\n")
    .replace(/<\/p>|<\/div>|<\/li>|<\/tr>|<\/h[1-6]>/gi, "\n");
  return decodeEntities(withBreaks.replace(/<[^>]*>/g, ""))
    .split("\n")
    .map((l) => l.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function baseName(name: string): string {
  const slash = Math.max(name.lastIndexOf("/"), name.lastIndexOf("\\"));
  const file = slash >= 0 ? name.slice(slash + 1) : name;
  return file.replace(/\.[^.]+$/, "");
}

export async function parseEml(file: FileInput, account: string): Promise<Interaction[]> {
  const email = await PostalMime.parse(file.data);
  const rawDate = email.date?.trim() ?? "";
  const time = rawDate === "" ? Number.NaN : Date.parse(rawDate);
  if (Number.isNaN(time)) {
    throw new WaadaError(`${file.name}: no parseable Date header; skipping this email.`);
  }
  const names: string[] = [];
  for (const addr of [
    ...(email.from ? [email.from] : []),
    ...(email.to ?? []),
    ...(email.cc ?? []),
  ]) {
    const name = displayName(addr).trim();
    if (name !== "" && !names.includes(name)) names.push(name);
  }
  const text = email.text?.trim() ?? "";
  const body = text !== "" ? text : email.html ? htmlToText(email.html) : "";
  const messageId = email.messageId?.trim() ?? "";
  const subject = email.subject?.trim() ?? "";
  return [
    {
      account,
      sourceId: messageId !== "" ? messageId : `file:${fileHash(file.data)}`,
      type: "email",
      date: new Date(time).toISOString(),
      title: subject !== "" ? subject : baseName(file.name),
      participants: names,
      content: stripQuotedReplies(body),
      source: "eml",
    },
  ];
}
