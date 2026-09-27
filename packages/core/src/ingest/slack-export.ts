// Slack export parser (M03): one Interaction per channel per day.
// Slack's per-channel, per-day files are arrays of messages with
// `ts`, `user`, `user_profile.real_name` and `text`.
import { z } from "zod";
import { WaadaError } from "../errors.ts";
import type { FileInput, Interaction } from "../models.ts";

export type SlackMetadata = { channelFallback?: string; users?: Record<string, string> };

const SlackMessage = z.object({
  text: z.string().nullish(),
  ts: z.string().nullish(),
  user: z.string().nullish(),
  user_profile: z
    .object({
      real_name: z.string().nullish(),
      display_name: z.string().nullish(),
    })
    .nullish(),
});
type SlackMessage = z.infer<typeof SlackMessage>;

const SlackFile = z.union([
  z.array(SlackMessage),
  z.object({
    channel: z.string().nullish(),
    messages: z.array(SlackMessage),
  }),
]);

function tsToDate(ts: string): number {
  return Number.parseFloat(ts) * 1000;
}

function timeLabel(ms: number): string {
  return new Date(ms).toISOString().slice(11, 16);
}

function dayLabel(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function channelFromName(name: string, payloadChannel?: string | null): string {
  const parts = name.replace(/\\/g, "/").split("/");
  const head = parts[0];
  if (parts.length >= 2 && head !== undefined && head !== "") return head;
  if (payloadChannel?.trim()) return payloadChannel.trim();
  return "unknown";
}

export async function parseSlackExport(
  file: FileInput,
  account: string,
  metadata: SlackMetadata = {},
): Promise<Interaction[]> {
  let raw: unknown;
  try {
    raw = JSON.parse(new TextDecoder().decode(file.data));
  } catch {
    throw new WaadaError(`${file.name}: not valid Slack export JSON; skipping this file.`);
  }
  const parsed = SlackFile.safeParse(raw);
  if (!parsed.success) {
    throw new WaadaError(`${file.name}: not valid Slack export JSON; skipping this file.`);
  }
  const payload = parsed.data;
  const messages = Array.isArray(payload) ? payload : payload.messages;
  const channel = Array.isArray(payload)
    ? channelFromName(file.name, metadata.channelFallback)
    : channelFromName(file.name, payload.channel);

  const nameOf = (m: SlackMessage): string =>
    m.user_profile?.real_name?.trim() ||
    m.user_profile?.display_name?.trim() ||
    (m.user ? metadata.users?.[m.user]?.trim() : undefined) ||
    m.user?.trim() ||
    "unknown";

  const lines: string[] = [];
  const participants: string[] = [];
  let earliest: number | null = null;
  for (const m of messages) {
    const text = m.text?.trim() ?? "";
    if (text === "") continue;
    const ms = m.ts ? tsToDate(m.ts) : Number.NaN;
    if (!Number.isNaN(ms) && (earliest === null || ms < earliest)) earliest = ms;
    const name = nameOf(m);
    if (!participants.includes(name)) participants.push(name);
    const flat = text.replace(/\s+/g, " ");
    lines.push(Number.isNaN(ms) ? `${name}: ${flat}` : `${timeLabel(ms)} ${name}: ${flat}`);
  }
  if (earliest === null) {
    throw new WaadaError(`${file.name}: no timestamped messages; skipping this file.`);
  }
  const day = dayInFileName(file.name) ?? dayLabel(earliest);
  return [
    {
      account,
      sourceId: `slack:${channel}:${day}`,
      type: "slack",
      date: new Date(earliest).toISOString(),
      title: channel === "unknown" ? `Slack — ${day}` : `#${channel} — ${day}`,
      participants,
      content: lines.join("\n"),
      source: "slack_export",
    },
  ];
}

function dayInFileName(name: string): string | null {
  const m = /(20\d\d-\d\d-\d\d)/.exec(name);
  return m?.[1] ?? null;
}
