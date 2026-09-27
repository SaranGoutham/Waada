# Master log

Plain-language record of what happened, newest first. Written by the master (Claude Code) for the human.

## 2026-09-27: card 009 done (baselines use imported data)

- **Card 009 (Codex): done**, committed by the master (3f8d568, 8681453, 2da7139). Import now saves what was imported (and `crm.json`) under `.waada/`, and Compare's baselines read that. Slack items get a real channel name. **Root cause of the wrong transcript dates:** the Import page never gave the parser an LLM; now it does.
- **Master fix:** re-importing an account didn't save anything for the baselines (only brand-new items were saved). Fixed with a test.
- Checks: `pnpm check` passes; tests 141 core + 4 web; web build OK.
- **Running:** card 008 (Codex, ledger judgement + Q4 in the brief). Then the master reruns the live eval and the browser flow.

## 2026-09-27: today's target run for real in the browser

- **Master ran the whole flow on localhost** with the real core, Hindsight Cloud and the free Groq key from `.env`:
  1. Settings → Test: "Connection test returned: OK". ✅
  2. Created "Acme Corp" (slug `acme-corp`); the empty brief shows "none" everywhere, no crash. ✅
  3. Imported all of `seed/acme`: preview of 33 interactions, then "Imported 33; skipped 0." ✅
  4. Brief (about a minute): SOC 2 promise listed as open, pricing landmine present. ⚠️ SOC 2 is third, not first; the Q3 → Q4 move is missing from "Recent changes".
  5. Ask "What changed since July?": correct Q3 → Q4 answer with sources. ✅ (MVP criterion 2)
  6. Compare: Waada column fills; both baselines say "not found" because they read `seed/acme-corp/`. ❌
- **Also seen:** two header-less transcripts got today's date (metadata extraction failed, no reason logged); Slack items titled `#unknown`; brief and answer markdown shown as raw text; the account heading shows the slug; Ask lists about 100 sources with duplicates.
- **Human decisions:** P-006, baselines read what the user imported (saved in `.waada/`), §6.8 note updated. Card 008 (ledger judgement + Q4 in recent changes) moved from OpenCode to Codex because OpenCode's free Muse model stayed rate-limited.
- **Running:** card 009 (Codex): baselines from imported data, CRM file upload, Slack channel names, transcript metadata. Then card 008 (Codex). The master runs the live eval after both.

## 2026-09-27: card 007 done: the brief works on a free Groq key

- **Human decisions:** OpenCode uses the Muse free model; AGENTS.md §5 S3 updated by the master with permission (fallback `openai/gpt-oss-20b`).
- **Card 007 (OpenCode + master):** each request is capped in size, brief and compare run their AI calls one at a time, and the app waits and retries when Groq says "retry after". OpenCode wrote the code and ran the eval, then hit **its own** model's rate limit twice; the master verified, committed (b5902eb, 745ceaf) and recorded the eval.
- **Eval now 4 of 6**, with no rate-limit failures; a brief takes about 63 seconds. The brief contains the SOC 2 promise and the pricing landmine, and Ask works.
- **Still failing (accuracy, not capacity):** the SOC 2 promise is third, not first (the ledger also counts two older items as open), and the $86k pricing proposal is marked "unclear" instead of "delivered". Next card fixes the ledger's judgement.

## 2026-09-27: card 006 done; card 007 started

- **Card 006 (OpenCode, M02): done** in 471cc67. Default Groq fallback is now `openai/gpt-oss-20b`. The e2e test now gives the LLM to the file parser, so the two headerless transcripts get proper dates. Checks: `pnpm check` passes; tests 119 core + 4 web. A `.waada/llm.json` saved earlier keeps its old fallback until re-saved in Settings.
- **Human decision:** Waada must work with a **free** Groq key. Card 007 (OpenCode) runs the big requests one at a time, caps each request's size, retries when Groq says "retry after", then reruns the eval.
- **Still open for the human:** update AGENTS.md §5 S3 to name `openai/gpt-oss-20b`.

## 2026-09-27: cards 004 and 005 back; Groq free tier is the blocker

- **Card 004 (Codex, M06): code done** (e9161ec). Compare uses the real core; Settings shows the key comes from `.env`; pages show a friendly error box. Codex's sandbox has no network, so it couldn't run the real flow; the master will.
- **Card 005 (OpenCode, M05): partial** (d7be835, 02127ab). Import of all 33 Acme items works against real Hindsight; **Ask passed live**. The **Brief never finished**: Groq's free tier allows 8,000 tokens per minute, and the brief's two big requests (about 6,700 tokens each, even after a new evidence cap) run in parallel. Scorecard recorded honestly in `docs/decisions/llm/evals.md`.
- **Human decision (P-005):** Groq fallback `qwen/qwen3-32b` no longer exists; replaced by `openai/gpt-oss-20b`. Card 006 changes the code.
- **Open question for the human:** how to make the brief fit (paid Groq tier vs. slower/smaller requests).

## 2026-09-27: card 003 done (Groq key from .env); cards 004 and 005 started

- **Human decision:** OpenCode uses the Muse free model (`opencode/muse-spark-1.3-contributor-free`) for all cards. The default model (longcat) dropped its connection mid-card.
- **Card 003 (OpenCode, M02): done** in 6655f23. A Groq key saved in Settings wins; otherwise `GROQ_API_KEY` from `.env` is used. The Settings page shows Groq as configured with only the env key, without exposing it. Checks: `pnpm check` passes; tests 116 core + 2 web.
- **Started in parallel:** card 004 (Codex: whole flow on real data in the web app + real Compare) and card 005 (OpenCode: live evaluation into `docs/decisions/llm/evals.md`).

## 2026-09-27: card 002 done (compare and baselines)

- **Card 002 (OpenCode, M05): done** in c2922b7. `compare` now returns three columns: CRM-only (from `seed/<account>/crm.json`), summary-only (all raw seed text, no Hindsight, 60,000-character budget, answer key files skipped) and Waada's brief. A failing column shows its error instead of breaking the page. Checks: `pnpm check` passes; tests 109 core + 2 web.
- **Next:** card 003 (OpenCode, `.env` Groq key fallback) is running; then card 004 (Codex) and card 005 (OpenCode).

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
