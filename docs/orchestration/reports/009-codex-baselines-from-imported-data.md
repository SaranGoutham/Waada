WORKER REPORT: card 009, M03 + M05 + M06
Status: done
Commits: none
Files changed: apps/web/src/lib/server.ts; apps/web/src/routes/accounts.$slug.import.tsx; packages/core/src/agent/baselines.ts; packages/core/src/ingest/crm.ts; packages/core/src/ingest/index.ts; packages/core/src/ingest/parse-files.ts; packages/core/src/ingest/pipeline.ts; packages/core/src/ingest/slack-export.ts; packages/core/src/ingest/transcript.ts; packages/core/test/agent-baselines.test.ts; packages/core/test/ingest-parse-files.test.ts; packages/core/test/ingest-pipeline.test.ts
Checks: pnpm --filter @waada/core test → 21 files, 140 tests passed; pnpm --filter web test → 2 files, 4 tests passed; pnpm --filter web build → succeeded; node node_modules/@biomejs/biome/bin/biome check <owned files> → clean; git diff --check → clean
Dependencies: M00 store/models/log → available; M02 LLM → available; M05 baselines contract → available
Blocked: none
Unverified: none
Notes for master: Baselines now read `.waada/interactions/<account>.json` and `.waada/crm/<account>.json`. Headerless transcripts were not extracting in the browser because Import called `parseFiles` without an LLM; both preview and import now create and pass the configured LLM. No secrets were read or logged.

---
**Master verification (2026-09-27):** reviewed the diff. Master fix before committing: `ingest` saved only newly added items, so a re-import (all skipped, or the early "nothing new" return) left `.waada/interactions/<account>.json` empty; now duplicates also fill gaps (never overwrite), with a new test. Also added tuple casts that strict typecheck needed in the new tests. Root `pnpm check` passes; `pnpm test` 141 core + 4 web green; web build OK. Commits: 3f8d568 (m03), 8681453 (m05), 2da7139 (m06).
