# Approach & Pipeline

How we attack the problem statement, and the end-to-end pipeline of the fix.

---

## Part 1 — How to approach the problem statement

### Principle 1: Build backwards from the demo moment (demo-driven development)

Don't start with code. Start with the exact moment the judges go *"ohhh"* and reverse-engineer everything it requires:

```
WOW MOMENT:  "Alex quit — but the new AE already knows about the
              undelivered promise and the resolved objection."
     ▲ needs
BRIEFING OUTPUT containing: landmine warning + undelivered promise
     ▲ needs
RECALL queries that can fetch: promises we made · objections & how they
were resolved · stakeholder roles · what changed recently
     ▲ needs
RETAINED INTERACTIONS containing those elements (with real timestamps!)
     ▲ needs
SYNTHETIC DATA written with the element checklist (DATA_PLAN.md)
```

Every engineering decision is justified by pointing at the demo moment. If a task doesn't serve it, cut it.

### Principle 2: Thin vertical slices, always runnable

Never build layer-by-layer (all data → all memory → all UI). Build **end-to-end slices** so you have a working demo at every hour mark:

| Slice | What ships | Gate (must pass before next) |
|---|---|---|
| 0 | Smoke test: retain 1 fact → recall it | memory round-trip works |
| 1 | 2-interaction mini `acme.json` + crude `brief` | briefing prints *anything* grounded |
| 2 | Full Acme data with all demo elements | all elements visible in Hindsight UI |
| 3 | `ask` + temporal query ("what changed since July?") | temporal recall returns the Q3→Q4 shift |
| 4 | `handoff-report` + `reflect()` observations | ≥1 consolidated pattern surfaces |
| 5 | `amnesia` baseline | contrast is obvious to a stranger |
| 6 | Error handling + polish | bad API key ≠ crash; demo is crash-proof |

If you run out of time at any slice, **you still have a demo**. That's the point.

### Principle 3: Every feature ships with its contrast

The judging criterion is memory being *central and visible*. So every capability has a before/after twin:

| With memory | Without (amnesia) |
|---|---|
| Briefing references the Aug 12 pricing resolution | Re-raises the pricing objection |
| "Alex promised docs Sep 2 — undelivered" | Knows no promises exist |
| "What changed since July?" → Q3→Q4 shift | Only current-stage field |

Run them back-to-back in the demo. The gap IS the product pitch.

### Principle 4: Map judging criteria to concrete artifacts

| Criterion | Artifact that earns the points |
|---|---|
| Innovation 30% | The departure framing + landmine/undelivered-promise mechanics |
| Memory 25% | retain/recall/reflect all visible in CLI output + UI tour |
| Technical 20% | Clean repo, function-calling retries, idempotent seeder |
| UX 15% | 4 simple commands; story-driven demo |
| Impact 10% | The $115K / week-one-deal-loss stats on the intro slide |

---

## Part 2 — The pipeline (the fix, end to end)

Four loops. Loops A+D run at seed/learning time; Loops B+C run live.

```
┌────────────────────────── LOOP A: WRITE PATH (seed time) ─────────────────────────┐
│                                                                                    │
│  seed/accounts/acme.json                                                           │
│  (calls, emails, notes — each with date, participants, content)                    │
│        │                                                                           │
│        ▼  chronological order                                                      │
│  seeder.py ── retain(content, context, timestamp, metadata) ──▶ HINDSIGHT BANK     │
│                                                                  waada-acme-corp   │
│        Hindsight internally: chunk → extract facts (world/experience)              │
│        → build entity graph (Priya─champion─Acme) → consolidate observations       │
└────────────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────── LOOP B: READ PATH (live briefing) ──────────────────────┐
│                                                                                    │
│  waada brief acme                                                                  │
│        │                                                                           │
│        ▼                                                                           │
│  Query planner (prompts.py): expand into targeted recalls                          │
│    q1 "promises we made, delivered or not"    q2 "objections and how resolved"     │
│    q3 "stakeholders, roles, sentiment"        q4 "what changed since July"         │
│        │                                                                           │
│        ▼  each via recall() — TEMPR: semantic + keyword + graph + temporal,        │
│           RRF fusion, recency boosts, token budget                                 │
│  Context assembly: dedupe, rank, cap tokens                                        │
│        │                                                                           │
│        ▼                                                                           │
│  Groq LLM + briefing system prompt                                                 │
│        │                                                                           │
│        ▼                                                                           │
│  BRIEFING: story · champion/blocker · ⚠️ landmine (don't re-open pricing) ·        │
│            🚩 undelivered promise (do this first) · prospect's own words           │
└────────────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────── LOOP C: BASELINE (the contrast) ───────────────────────┐
│  waada amnesia acme ─▶ same LLM, but input = CRM fields only                       │
│  (stage, amount, "follow up next week") ─▶ generic discovery restart,              │
│  re-raises resolved objection.  Nothing else changes → gap is purely memory.       │
└────────────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────── LOOP D: LEARNING (reflect) ─────────────────────────────┐
│  After seeding: reflect("what patterns hold across interactions/deals?")           │
│  → consolidated observations, e.g. "pricing objections on deals >$50K resolve      │
│    with annual billing" → surfaced in handoff-report as "learned patterns".        │
└────────────────────────────────────────────────────────────────────────────────────┘
```

### Why each loop matters for the fix

| Loop | Problem-sentence it fixes |
|---|---|
| A — retain with **timestamps + attribution** | "Context lived in the rep's head" → now it lives in a bank, dated and attributed |
| B — multi-query recall + synthesis | "New owner restarts discovery" → briefing in seconds, with sources |
| C — amnesia baseline | Makes the value *measurable*: re-asked questions 7 → 0 |
| D — reflect | Turns one deal's memory into reusable deal wisdom (the "improves over time" criterion) |

---

## Part 3 — Validation gates (prove it works before you polish)

Run these checks after each slice; if one fails, fix before moving on:

1. **Round-trip:** retain a fact → recall returns it.
2. **Attribution:** *"Who promised the security docs?"* → "Alex, on Sep 2".
3. **Temporal:** *"What changed since July?"* → Q3→Q4 timeline shift.
4. **Landmine:** briefing explicitly says pricing objection is resolved / don't re-open.
5. **Undelivered promise:** surfaces without being directly asked.
6. **Contrast:** amnesia output contains NONE of the above (and ideally re-raises pricing).
7. **Robustness:** kill the API key → friendly error, no stack trace.

---

## Part 4 — Risks & mitigations (known in advance)

| Risk | Mitigation |
|---|---|
| Groq function-calling errors mid-demo | Retry + repair-prompt + plain-completion fallback in `llm.py` (ARCHITECTURE.md) |
| Seeding slow / async lag | Use `retain_async=False`; seed once, never re-seed during demo |
| Recall misses the landmine | Multi-query planner (separate query for objections) instead of one giant query; tune `budget="high"` for briefings |
| Synthetic data feels fake | Realism pass checklist in DATA_PLAN.md; quote Priya verbatim on stage |
| Time overrun | Slice order = priority order; slice 5 (amnesia) is short and makes everything look better |
