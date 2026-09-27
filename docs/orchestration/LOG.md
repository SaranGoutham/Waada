# Master log

Plain-language record of what happened, newest first. Written by the master (Claude Code) for the human.

## 2026-09-27: switched to master/worker

- **Decision (human):** Claude Code is the master; Codex and OpenCode are workers run by the master (`codex exec`, `opencode run`). The human talks only to the master.
- **Fixed:** git pushes were hanging because GitHub credentials had expired. Git now uses the GitHub CLI's login (`gh auth setup-git`). Local and GitHub `dev` are in sync.
- **State at switch:**
  - tests 101/101 green
  - `pnpm check` broken by nested config files in the uncommitted M06 scaffold (`apps/web/biome.json`, `apps/web/pnpm-lock.yaml`, `apps/web/pnpm-workspace.yaml`)
  - M05 has ledger, landmines, brief and ask committed; compare and baselines not yet
  - M06 is scaffolded but nothing is committed
  - no Groq key is configured yet
- **Next cards:** 001 Codex, M06 (fix nested config, commit the web app); 002 OpenCode, M05 (compare and baselines).
