WORKER REPORT: card 002, M05
Status: done
Commits: c2922b7 m05: add CRM-only and summary-only baselines with compare
Files changed: packages/core/src/agent/baselines.ts (new), packages/core/src/agent/index.ts,
  packages/core/src/agent/prompts.ts, packages/core/test/agent-baselines.test.ts (new),
  docs/decisions/llm/prompts/v1-baseline-crm.md (new),
  docs/decisions/llm/prompts/v1-baseline-summary.md (new),
  docs/decisions/llm/task-routing.md (new),
  docs/superpowers/plans/2026-09-27-m05-agent-core.md (ticked baselines box only)
Checks: npx pnpm@12.6.0 --filter @waada/core test → 8/8 new tests green (109 total core);
  npx pnpm@12.6.0 check → passes (biome + both typechecks clean);
  npx pnpm@12.6.0 test → 18 files/109 tests core + 1 file/2 tests web, all pass;
  git diff --cached --name-only → only the 8 card-listed files
Dependencies: M03 parseFiles → available (used by baselineSummary); M04 seed data → available
  (seed/acme: 33 interactions + crm.json); M01/M02 → available (brief leg of compare);
  Groq key → not needed (unit tests use FakeLLM/FakeMemory only, per card step 5)
Blocked: none
Unverified: none
Notes for master:
- baselineSummary truncates raw text to SUMMARY_BUDGET_CHARS = 60,000 (~15k tokens),
  keeping the MOST RECENT content (a brief leads with recent changes); acme's ~30k chars
  currently fits untruncated. Documented in code, prompts/v1-baseline-summary.md and
  task-routing.md.
- baselineSummary reads seed/<account> via findProjectRoot() (walks up to
  pnpm-workspace.yaml), the same path the M10 e2e test expects ("baselines read
  seed/acme/crm.json"). It walks emails/, transcripts/, slack/<channel>/20*.json and
  deliberately skips EXPECTED.md/README.md so the answer key can never leak into the
  baseline. If M04 or later changes the seed layout, revisit supportedFile() in
  baselines.ts.
- compare creates up to 3 LLM instances when deps.llm is not passed (one per leg,
  same as the existing per-function createLLM() pattern); the M10 e2e compare test
  passes deps without llm and will exercise this.
- report() remains a notImplemented stub (should-have tier, card step 5); the live
  eval is card 005's scope.
- Codex's card 001 (apps/web, biome.json, pnpm-lock.yaml, .gitignore) was untouched;
  their m06 commit 4535d6f landed in the log while I worked.

---
**Master verification (2026-09-27):** commit c2922b7 touches only card-listed files, no AI attribution. Root `pnpm check` passes; `pnpm test` 109 core + 2 web green.
