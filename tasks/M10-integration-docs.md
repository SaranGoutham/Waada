# M10 — Integration, docs & demo

**Goal:** make the merged modules work together end to end, bring every doc in line with the TypeScript build, and prepare the demo. Runs last (Wave 3). **Report what's true; don't polish over gaps.**

## Files you own

```
README.md  SETUP.md  WORKFLOW.md  PIPELINE.md  DATA_PLAN.md  DEMO_SCRIPT.md
SOLUTION_DESIGN.md  PROBLEM_STATEMENT.md  ARCHITECTURE.md
packages/core/test/e2e.live.test.ts
docs/reports/m10-integration.md
```
You may **read** everything. Code changes in other modules go back to their owner as a note in `docs/PROGRESS.md`, or as a small fix PR the human approves.

## Build

1. **End-to-end test** (`e2e.live.test.ts`): fresh bank → `parseFiles(seed/acme)` + `ingest` → `brief` → assert against `EXPECTED.md` (first item = open Sep 2 commitment; pricing landmine present) → `ask("What changed since July?")` mentions Q4 → `compare` returns three non-empty columns → `deleteBank`.
2. **Docs rewrite.** Everything must match AGENTS.md §5 and §7 (TypeScript, TanStack Start, pnpm, AI SDK, no CLI):
   - `README.md`: what Waada is, the honest positioning from MARKET_ANALYSIS.md §4, quickstart, and a **"How Hindsight memory is used"** section (retain, recall, reflect, temporal queries, with file links). Required for submission.
   - `SETUP.md`: Node 22, pnpm, Hindsight Cloud **or** Docker, choosing an LLM in Settings, optional connectors (link `docs/connectors/*`), the MCP setup (link `docs/mcp.md`), the extension (link `docs/capture.md`).
   - `ARCHITECTURE.md`, `WORKFLOW.md`, `PIPELINE.md`, `SOLUTION_DESIGN.md`, `DATA_PLAN.md`: update to the built system (diagrams included).
   - `PROBLEM_STATEMENT.md`: remove unverified claims ("twists nobody else will demo", "nobody else"). Replace "7 → 0" with the **measured** result from M05's evals and the `EXPECTED.md` questions, or label it clearly as a target.
3. **Demo script** (`DEMO_SCRIPT.md`): the 60-second live flow in the **web app**:
   1. Import the departed rep's export
   2. Brief with the open commitment first
   3. Compare with the CRM and summary baselines
   4. `ask` "what changed since July?"
   5. The same brief pulled through MCP in Claude Code
   
   Plus the 2–5 minute video outline. Keep the rule from the old script: never mention the hackathon in public content.
4. **Robustness pass:** wrong Hindsight URL, no LLM key, bad LLM key, malformed model output, Slack token missing. Each must show a friendly message in the web app and MCP. List results in your report.

## Acceptance

- [ ] `pnpm install && pnpm check && pnpm test` green on `main` after all merges
- [ ] `pnpm test:live` e2e passes (paste the output)
- [ ] A fresh clone → SETUP.md → brief visible in under 30 minutes (time it; report the actual time)
- [ ] Robustness checklist results in the report
- [ ] Every doc's commands were actually run once
