# Master log

Plain-language record of what happened, newest first. Written by the master (Claude Code) for the human.

## 2026-09-27: card 001 done (web app committed)

- **Two master sessions ran at once** by accident (an interrupted chat kept going) and sent cards 001 and 002 twice. The human stopped the other session's workers; only this session dispatches now.
- **OpenCode** failed twice to start ("background service" timeout). Fixed by running it with `--standalone`. Card 002 is running.
- **Card 001 (Codex, M06): done.** Nested config removed, web app joined the workspace. Codex's sandbox can't write inside `.git`, so the master made the commits (ba21eb4, ad3a76b, 4535d6f). Root `pnpm check` passes again; tests 101 core + 2 web; web build succeeds. Brief and Ask call the real core; Compare is still sample data.
- **From now on:** Codex cards say "don't commit"; the master commits Codex's work after verifying it.
- **Groq key** is now set in `.env`, so the real LLM path can run once card 003 lands.
- **Written:** card 004 (Codex: whole flow on real data + real Compare), card 005 (OpenCode: live evaluation).

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

- **Human asked for `GROQ_API_KEY` in `.env`.** Added an empty line to `.env` (gitignored) and `.env.example`; AGENTS.md rule 6 now allows it as a fallback (Settings wins). The code doesn't read it yet, so card 003 (OpenCode, after 002) adds the fallback.
