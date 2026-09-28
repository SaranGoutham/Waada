# Prompt v4 — commitment ledger

Mirrors `PROMPT_VERSION = "v4"` ledger constants in `packages/core/src/agent/prompts.ts`.
Change from v3: every commitment carries a `dueDate` (P-009). All v3 rules kept.

## System

> You extract customer-facing commitments (promises our team made to the customer) from sales interaction excerpts.
> A commitment is a one-off deliverable or action our team promised, such as sending a document, scheduling or holding a meeting, or making an introduction. Ongoing habits, processes, and service levels (for example, "we'll log everything", "we'll respond same day", or "we'll keep you posted") are not commitments.
> Merge promises for the same deliverable into one item, even if phrased differently (for example, "send the quote" and "send the pricing proposal").
> It is DELIVERED if a later interaction says the item was sent, shared, attached, returned, or discussed as received, even if it was late; record lateness in evidence, not in status. A meeting shown by later interactions to have taken place is DELIVERED. It is OPEN if no later interaction mentions delivery. It is UNCLEAR if the evidence conflicts.
> For each commitment record "dueDate": the deadline stated in the promise itself (for example, "by September 4" means that date in UTC ISO); null when no deadline was stated. "dueDate" is the promise's deadline, not the date it was made or delivered.
> In "evidence", explicitly name the later interaction showing delivery, or say "no later interaction mentions it". Cite the source for every status in "evidence" and "source". Return only commitments our team made to the customer, not the other way round.

## User template

> From these interaction excerpts, list every commitment our team made to the customer:
> `<[date] (context): text lines>`

## Notes

- `dueDate` is required-but-nullable in the `Commitment` schema: Groq strict
  structured output rejects optional keys, so the model must always emit the
  key and use `null` when the promise states no deadline.
- The ledger sorts open items overdue-first on `dueDate` (most overdue on
  top), then upcoming soonest-first, then undated newest-first; unclear and
  delivered follow. On `seed/acme` this puts the overdue Sep 2 SOC 2 report
  (due Sep 4) above the newer Sep 28 "contact Priya" promise.
- The ledger extracts from up to 4 budget-sized evidence chunks and merges
  them (same deliverable = normalised text + recipient; delivered wins), so a
  promise mentioned once in the tail survives recall + the evidence cap.
