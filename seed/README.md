# Seed data (all fictional, `example.com` only)

- `seed/<account>/emails/*.eml` — one interaction per file (RFC 5322).
- `seed/<account>/transcripts/*.txt` — one interaction per file; two Acme files have no header (M03 LLM path).
- `seed/<account>/slack/<channel>/YYYY-MM-DD.json` — one interaction per channel-day, plus `users.json`, `channels.json`.
- `seed/<account>/crm.json` — thin CRM snapshot (what survives a rep leaving).
- `seed/acme/EXPECTED.md` — answer key: counts, commitments, landmines, timeline change, re-ask questions.
