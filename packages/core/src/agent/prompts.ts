// Versioned LLM prompt constants (M05). PROMPT_VERSION v2.
// Each version is mirrored in docs/decisions/llm/prompts/ for review.
export const PROMPT_VERSION = "v2";

export const LEDGER_SYSTEM = `You extract customer-facing commitments (promises our team made to the customer) from sales interaction excerpts.
A commitment is a specific deliverable or action our team promised, such as sending a document, scheduling or holding a meeting, or making an introduction. Do not treat an ongoing pilot service level as a commitment unless a specific instance was promised and missed.
It is DELIVERED if any later interaction shows the action was done, even if it was late; record lateness in evidence, not in status. A meeting shown by later interactions to have taken place is DELIVERED. It is OPEN if no later interaction shows delivery. It is UNCLEAR if the evidence conflicts.
Cite the source for every status in "evidence" and "source". Return only commitments our team made to the customer, not the other way round.`;

export function ledgerUser(evidence: string): string {
  return `From these interaction excerpts, list every commitment our team made to the customer:\n${evidence}`;
}

export const LANDMINES_SYSTEM = `You extract resolved customer objections (landmines) from sales interaction excerpts.
Each landmine has the objection raised, what happened, how it was resolved, and imperative guidance for the next rep ("Do NOT re-open …").
Cite the source for every landmine in "source". Only include objections that were actually resolved or accepted.`;

export function landminesUser(evidence: string): string {
  return `From these interaction excerpts, list every resolved objection the new rep must not re-open:\n${evidence}`;
}

export const BRIEF_SYSTEM = `You write a deal-continuity brief for a sales rep who just inherited an account.
Render markdown with exactly these sections in this order:
1. Open commitments
2. Landmines
3. People
4. Deal story (4 sentences or fewer)
5. Recent changes
6. Customer words to lead with.
In Open commitments, list exactly and only the supplied open commitments in their supplied order; do not add delivered, unclear, or inferred items.
Only use the evidence given; do not invent facts.`;

export function briefUser(a: {
  commitments: { text: string; status: string; evidence: string; source: string }[];
  landmines: { topic: string; resolution: string; guidance: string; source: string }[];
  stakeholders: string;
  recent: string;
}): string {
  const commitments =
    a.commitments.map((c) => `- [${c.status}] ${c.text} (${c.evidence}; ${c.source})`).join("\n") ||
    "none";
  const mines =
    a.landmines
      .map((m) => `- ${m.topic}: ${m.resolution} Guidance: ${m.guidance} (${m.source})`)
      .join("\n") || "none";
  return `Write the brief with these sections in order: open commitments, landmines, people, deal story (4 sentences or fewer), recent changes, customer words to lead with. In Open commitments, list exactly and only the supplied items in their order.\n\nOpen commitments:\n${commitments}\n\nLandmines:\n${mines}\n\nPeople:\n${a.stakeholders || "none"}\n\nRecent changes:\n${a.recent || "none"}`;
}

export const ASK_SYSTEM = `You answer the rep's question using ONLY the recalled memory excerpts below.
Cite the sources in your answer. If the excerpts do not contain the answer, say it is not in memory instead of guessing.
For temporal questions, trust the recall results; do not re-filter by date.`;

export function askUser(question: string, excerpts: string[]): string {
  return `Answer only from these memory excerpts. Question: ${question}\n${excerpts.map((e) => `- ${e}`).join("\n")}`;
}

// Baselines (card 002): same system prompt (BRIEF_SYSTEM) and output format as the
// brief, but the user message makes clear what little evidence is available.
export function baselineCrmUser(fields: string): string {
  return `Write the brief using ONLY these CRM record fields. No emails, calls or messages are available to you:\n${fields}`;
}

export function baselineSummaryUser(transcript: string): string {
  return `Write the brief using ONLY the raw interaction text below (oldest first, possibly truncated). No search, highlights or memory are available to you:\n${transcript}`;
}
