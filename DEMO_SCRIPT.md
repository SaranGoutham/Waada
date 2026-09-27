# Demo Script

## A. The 60-second live demo (judges)

**Pre-stage:** terminal open, font size 16+, two panes ready. Account `acme` already seeded.

| t | Say | Show |
|---|---|---|
| 0:00 | *"Acme Corp, an $86K deal. Alex built this relationship over six weeks — every call, every email, remembered by Waada."* | `python -m waada.cli ask acme "What's the latest with Acme?"` (quick answer) |
| 0:10 | *"On Friday, Alex quit."* | — |
| 0:15 | *"Here's what a new AE gets from the CRM alone."* | `python -m waada.cli amnesia acme` → generic output that restarts discovery and re-raises pricing |
| 0:25 | *"Here's what they get with Waada."* | `python -m waada.cli brief acme` |
| 0:35 | Point at the brief line by line: *"Do NOT re-open pricing — resolved Aug 12. Alex promised security docs Sep 2 — still undelivered. Priya's own words to lead with."* | Scroll slowly through the briefing output |
| 0:50 | *"Questions the new AE has to re-ask: seven. With Waada: zero. Memory that survives the handoff."* | Metric slide / terminal banner |

**Rules:** no reading verbatim; keep it conversational; if something glitches, say *"this is a live LLM"* and keep moving.

## B. The 2–5 minute video (content-guide structure)

1. **Intro (30s)** — who you are; one sentence: *"Sales deals die when reps leave, because context lives in their heads. Waada gives every deal a memory that survives the handoff."*
2. **The problem (30s)** — show the amnesia baseline; quote the Reddit pain: *"we lost like 3 deals in the first week because new people had zero context."*
3. **Live demo (2–3 min)** — the full walkthrough:
   - Seed command → open the Hindsight UI to show retained memories
   - `brief`, `ask` (including *"What changed since July?"*), `handoff-report`
   - Show one `retain()`/`recall()` call in code (`waada/memory.py`) — the "memory is real" moment
4. **Wrap (30s)** — one takeaway: *"The CRM remembers fields. Hindsight lets the agent remember what actually happened — and that's what survives turnover."*

## C. Five YouTube title options

1. Our Best Sales Rep Quit — This Agent Remembered Everything
2. I Built an AI That Remembers Deals After the Rep Leaves
3. The CRM Can't Remember This. Hindsight Can.
4. Zero Repeats: An Agent That Survives Sales Handoffs
5. Your Deals Die at Handoff — I Built the Fix

## D. Recording checklist

- [ ] 1080p screen recording (OBS / Loom / QuickTime); webcam overlay preferred
- [ ] Terminal font enlarged; notifications off; unrelated tabs closed
- [ ] Practice once end-to-end before recording
- [ ] Thumbnail via Nano Banana (16:9, include a team photo if possible)
- [ ] Publish as PUBLIC on YouTube with the thumbnail
