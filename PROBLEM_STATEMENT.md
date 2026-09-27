# Problem Statement — Waada
### *When a sales rep leaves, the deal's memory shouldn't leave with them.*

**One-line statement:**
> Build an AI agent that gives every deal **persistent, transferable memory** — so when a rep quits, goes on leave, or hands a deal off, the new owner picks up mid-conversation instead of restarting discovery and re-asking questions the prospect already answered.

---

## 1. The Problem (with evidence)

When sales reps leave or deals transfer (SDR → AE → CS), the context that made the deal real — objections overcome, promises made, stakeholder dynamics, the prospect's own words — lives **in the rep's head and scattered personal notes**, not anywhere searchable.

| Evidence | Source |
|---|---|
| "Our best AE just quit and suddenly his accounts are just floating. We lost like 3 deals in the first week because new people had zero context." | r/b2b_sales practitioner, Apr 2026 |
| Replacing a sales rep costs ~**$115K and 189 days**; every deal they touched loses continuity | Granola — *Why deals stall* |
| New owners *"restart discovery, re-ask questions your prospect already answered"* — deals stall from context decay, not product fit | Granola |
| Customers *"spent six weeks explaining their situation during the sale — and explain it again"* at handoff | Chaser — *Sales→CS handoff* |
| Objections, promises, stakeholder info trapped in personal notes/Slack; new owners risk *"reopening concerns that were already resolved"* | Scratchpad — *Sales handoffs* |

**Root cause:** CRM fields capture *what stage* a deal is in. Nothing captures *what actually happened* — and nothing survives the person who knew it.

---

## 2. The Solution

**Waada** is a deal-continuity agent with a persistent memory layer (Hindsight):

1. **Every interaction is retained** — call transcripts, emails, internal notes go into a per-account memory bank via `retain()`. Facts are attributed to *who said them* (prospect vs. rep vs. CSM).
2. **Handoff briefing in seconds** — the new owner asks anything: *"What's the full story on Acme?"*, *"What did we promise?"*, *"What changed since July?"* — answered via `recall()` with sources.
3. **Landmine guardrails** — proactive warnings: *"Do NOT re-open the pricing objection — resolved Aug 12 with the annual-billing offer."*
4. **Undelivered-promise detection** — *"Alex promised security docs on Sep 2 — still undelivered. Do this first."*
5. **Learning over time** — `reflect()` consolidates patterns: *"Pricing objections on deals >$50K are usually resolved with annual billing."*

---

## 3. The 60-second demo story

1. **Setup (10s):** "Acme Corp," a live deal with 6 weeks of history — 3 calls, emails, one objection, one promise. All retained in Hindsight.
2. **The twist (10s):** *"On Friday, Alex — the AE who built this relationship — quit."*
3. **Without memory (15s):** An amnesic agent with only the CRM record drafts an intro that restarts discovery and **re-raises the already-resolved pricing objection**.
4. **With Waada (25s):** The new AE asks for a brief and gets: deal story, champion & blocker, the undelivered promise, the landmine warning, and the prospect's own words to lead with.

**On-screen metric:** *Questions the new AE would re-ask: 7 → 0.*

---

## 4. Hindsight memory mapping (25% judging criterion)

| Feature | Hindsight capability | Demo moment |
|---|---|---|
| Retain all interactions | `retain()` into per-account bank | Seeding 6 weeks of history |
| Who said/promised what | Attributed world vs. experience facts | *"Alex promised the docs on Sep 2"* |
| Natural-language recall | `recall()` — semantic + keyword + entity graph + temporal | *"What changed since July?"* |
| Undelivered promises | Experience facts + temporal queries | The kicker moment |
| Consolidated deal wisdom | `reflect()` → observations | *"Pricing objections >$50K resolve with annual billing"* |
| Contradiction handling | Observation conflict resolution | Champion changes jobs → memory updates |

---

## 5. Scope (solo, ~1 day)

**In scope (MVP):**
- Python CLI (Typer/Rich), clean & documented
- 2–3 seeded synthetic accounts with realistic transcripts/emails (LLM-generated)
- Commands: `brief`, `ask`, `handoff-report`, `amnesia` (memory-less baseline)
- Groq LLM with function-calling error handling + retries
- README + architecture diagram + "how memory is used" explanation

**Out of scope:** real CRM integrations, auth/multi-tenancy, real-time call ingestion, web UI (stretch only).

---

## 6. Judging-criteria mapping

| Criterion | Weight | How Waada scores it |
|---|---|---|
| Innovation | 30% | Not "chatbot remembers user" — *memory that survives personnel change*; landmine warnings + undelivered-promise detection are twists nobody else will demo |
| Hindsight Memory | 25% | retain/recall/reflect all visible; temporal + graph + contradiction handling that vector search can't do |
| Technical Implementation | 20% | Clean repo, function-calling error handling, documented architecture |
| UX | 15% | Simple CLI; demo tells a story with a twist and a measurable before/after (7 → 0) |
| Real-world Impact | 10% | $115K/rep replacement cost; deals lost in week one; every B2B org with turnover has this wound |
