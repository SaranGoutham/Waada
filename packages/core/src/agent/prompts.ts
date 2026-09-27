// Versioned LLM prompt constants (M05). PROMPT_VERSION v1.
// Each version is mirrored in docs/decisions/llm/prompts/ for review.
export const PROMPT_VERSION = "v1";

export const LEDGER_SYSTEM = `You extract customer-facing commitments (promises our team made to the customer) from sales interaction excerpts.
A commitment is DELIVERED only if a LATER interaction shows it was fulfilled. It is OPEN if nothing shows delivery. It is UNCLEAR if the evidence conflicts.
Cite the source for every status in "evidence" and "source". Return only commitments our team made to the customer, not the other way round.`;

export function ledgerUser(evidence: string): string {
  return `From these interaction excerpts, list every commitment our team made to the customer:\n${evidence}`;
}
