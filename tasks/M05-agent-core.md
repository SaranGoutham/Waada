# M05 — Agent core (the product logic)

**Goal:** implement AGENTS.md §6.8: commitment ledger, landmines, brief, ask, report, and the two baselines. This is where Waada's claimed USP either works or doesn't, so **measure it** against `seed/acme/EXPECTED.md`.

## Files you own

```
packages/core/src/agent/index.ts          (replace M00's stub)
packages/core/src/agent/ledger.ts  landmines.ts  brief.ts  ask.ts  report.ts  baselines.ts
packages/core/src/agent/prompts.ts        (versioned constants; each version mirrored in docs/decisions/llm/prompts/)
packages/core/test/agent*.test.ts  packages/core/test/agent.live.test.ts
docs/decisions/llm/task-routing.md  docs/decisions/llm/prompts/*  docs/decisions/llm/evals.md
packages/core/test/agent.eval.live.test.ts   (runs the checks in "Evaluation" via `pnpm test:live`, writes evals.md; no extra script runner needed)
```

## Build

All functions use `deps?.memory ?? createMemory()` and `deps?.llm ?? await createLLM()`.

1. **`commitmentLedger(account)`**
   - Recalls (`budget: "high"`): "commitments or promises our team made to the customer", "documents, proposals or materials we sent or delivered", "follow-ups we owe the customer", "things the customer is still waiting for".
   - Dedupe the hits by text and give the combined list, each hit with its date and context, to `llm.extract` with `z.object({ commitments: z.array(Commitment) })`.
   - The prompt must say: a commitment is **delivered** only if a *later* interaction shows it was fulfilled; **open** if nothing shows delivery; **unclear** if evidence conflicts. Cite the source for every status.
   - Sort: open (newest promise first; human, 2026-09-27, P-007) → unclear → delivered. `null` from extract → return `[]` and log a warning.
2. **`landmines(account)`**
   - Recalls: "objections the customer raised and how they were resolved", "topics the customer is sensitive or negative about", "things the customer explicitly accepted or agreed to".
   - Extract `Landmine[]`. Guidance is imperative ("Do NOT re-open …").
3. **`brief(account)`**: run the ledger and landmines in parallel, plus recalls for "stakeholders, their roles, what each cares about, sentiment" and "what changed recently, timeline changes". `llm.chat` renders markdown in this order:
   1. 🚩 open commitments
   2. ⚠️ landmines
   3. people
   4. the deal story (≤ 4 sentences)
   5. recent changes
   6. the customer's own words to lead with
   
   Return `Brief` with the structured lists too, so the UI can render them as tables.
4. **`ask(account, question)`**: one recall (`budget: "high"`), answer only from the memories, cite sources (`Answer.citations`). Say "not in memory" instead of guessing. Temporal questions ("since July") go straight to recall. Hindsight handles the temporal part; don't re-implement date filtering.
5. **`report(account)`**: the brief + `memory.reflect` on 2–3 cross-cutting questions (e.g. "What patterns explain how objections on this deal were resolved?") → markdown including a "Learned patterns" section.
6. **Baselines** (same model, same output format as the brief):
   - `baselineCrm`: input is **only** CRM fields (`seed/<account>/crm.json`, or `crmFields` from HubSpot if configured).
   - `baselineSummary`: input is **all raw interaction text**. Read `seed/<account>` through `parseFiles` (M03), concatenate by date, and truncate to the model's context budget. No Hindsight. This is the honest competitor stand-in.
   - `compare` runs all three.

## Evaluation (required, not optional)

`agent.eval.live.test.ts` runs against `seed/acme` with a real model and checks, from `EXPECTED.md`:
- [ ] Sep 2 SOC 2 commitment present, status **open**, and it's the **first** item of the brief
- [ ] The delivered commitment has status **delivered**
- [ ] Pricing landmine present, with "don't re-open" guidance
- [ ] `ask("What changed since July?")` mentions the Q3 → Q4 move
- [ ] For each of the same checks: does `baselineSummary` get it? Record pass/fail for **both** Waada and the summary baseline

Write the results with date and model to `docs/decisions/llm/evals.md`. **If the summary baseline passes as many checks as Waada, say so plainly in your report.** That's a product finding, not a failure to hide.

## Acceptance

- [ ] Unit tests with `FakeMemory` + `FakeLLM`: query sets, sort order, `null` handling, markdown section order, baselines never call `memory`
- [ ] Eval run pasted in the report (needs M01, M02, M03, M04 done on `dev`)

## References

AGENTS.md §6 · `seed/acme/EXPECTED.md` (from M04) · Hindsight recall/reflect docs: https://hindsight.vectorize.io/
