import type { Commitment, Interaction } from "@waada/core";

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(
    new Date(value),
  );
}

export type BriefSection =
  | "open commitments"
  | "landmines"
  | "people"
  | "deal story"
  | "recent changes"
  | "customer words";

const headings: Record<string, BriefSection> = {
  "open commitments": "open commitments",
  landmines: "landmines",
  people: "people",
  "deal story": "deal story",
  "recent changes": "recent changes",
  "customer words": "customer words",
  "customer words to lead with": "customer words",
};

function headingFor(line: string): BriefSection | undefined {
  const cleaned = line
    .trim()
    .replace(/^#{1,6}\s+/, "")
    .replace(/^\*\*|\*\*$/g, "")
    .replace(/:$/, "")
    .trim()
    .toLowerCase();
  return headings[cleaned];
}

/** Splits model markdown even when it omits conventional Markdown heading markers. */
export function briefSections(markdown: string): Partial<Record<BriefSection, string>> {
  const collected: Partial<Record<BriefSection, string[]>> = {};
  let current: BriefSection | undefined;

  for (const line of markdown.split(/\r?\n/)) {
    const heading = headingFor(line);
    if (heading) {
      current = heading;
      collected[current] ??= [];
    } else if (current) {
      collected[current]?.push(line);
    }
  }

  return Object.fromEntries(
    Object.entries(collected)
      .map(([key, lines]) => [key, lines.join("\n").trim().replace(/\*\*/g, "")])
      .filter(([, text]) => text),
  ) as Partial<Record<BriefSection, string>>;
}

export type SourceDisplay = {
  date?: string;
  type: "email" | "slack" | "call" | "note";
  title: string;
};

export function sourceDisplay(source: string): SourceDisplay {
  const iso = source.match(/\[?(\d{4}-\d{2}-\d{2})T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?\]?/i)?.[1];
  const date = iso ? formatDate(`${iso}T00:00:00.000Z`) : undefined;
  const withoutDate = source
    .replace(/\[?\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?\]?\s*/gi, "")
    .replace(/^\(?\s*|\s*\)?$/g, "")
    .trim();
  const type: SourceDisplay["type"] = /slack/i.test(withoutDate)
    ? "slack"
    : /call|meeting|transcript/i.test(withoutDate)
      ? "call"
      : /email|eml|mail/i.test(withoutDate)
        ? "email"
        : "note";
  const title = withoutDate.replace(/^(email|slack|call|meeting)\s*[—:-]\s*/i, "") || source;
  return { date, type, title };
}

export function commitmentRow(commitment: Commitment) {
  return {
    status: commitment.status,
    promise: commitment.text,
    people: `${commitment.madeBy} → ${commitment.madeTo}`,
    date: formatDate(commitment.date),
    dueDate: commitment.dueDate ? formatDate(commitment.dueDate) : "",
    overdue: Boolean(
      commitment.status === "open" &&
        commitment.dueDate &&
        new Date(commitment.dueDate).getTime() < Date.now(),
    ),
    evidence: commitment.evidence,
    source: commitment.source,
  };
}

export function importPreviewRow(interaction: Interaction) {
  return {
    date: formatDate(interaction.date),
    type: interaction.type,
    title: interaction.title,
    participants: interaction.participants.join(", ") || "—",
  };
}
