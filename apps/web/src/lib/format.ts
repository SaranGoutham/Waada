import type { Commitment, Interaction } from "@waada/core";

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(
    new Date(value),
  );
}

export function commitmentRow(commitment: Commitment) {
  return {
    status: commitment.status,
    promise: commitment.text,
    people: `${commitment.madeBy} → ${commitment.madeTo}`,
    date: formatDate(commitment.date),
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
