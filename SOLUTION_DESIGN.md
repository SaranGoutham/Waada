# Solution Design — What We Propose & How We Handle Data

## 1. Positioning (one sentence)

> **Waada is a continuity layer: it sits below the capture tools (Gong, Fathom, email) and beside the CRM, and turns raw deal interactions into an account-owned, consolidated memory that survives personnel change.**

> *Waada* (वादा) = Hindi for **"promise."** The name is the feature: every promise made on the deal is remembered, tracked, and surfaced — starting with the one the departed rep never delivered.

We are **not**: another note-taker (capture exists), a CRM replacement (fields still matter — they're our amnesia baseline), or a rep-coaching tool. We own the moment every incumbent ignores: **the handoff**.

```
   CAPTURE LAYER            WAADA (new)                 SURFACES
┌─────────────────┐   ┌─────────────────────────┐   ┌──────────────────┐
│ Gong / Fathom / │   │ ingest → retain()       │   │ CLI brief/ask    │
│ Fireflies       │──▶│ per-account Hindsight   │──▶│ handoff-report   │
│ Gmail / Slack   │   │ banks (facts, graph,    │   │ (future) MCP     │
│ Meeting exports │   │ observations, pages)    │   │ server, Slack bot│
└─────────────────┘   └────────────┬────────────┘   └──────────────────┘
                                   │ reads CRM fields for
        ┌──────────────────┐       │ the amnesia baseline
        │ Salesforce /     │◀──────┘
        │ HubSpot (fields) │
        └──────────────────┘
```

## 2. Integrations — MVP vs proposed roadmap

### MVP (hackathon scope — deliberately manual)
| Integration | How | Why this scope |
|---|---|---|
| **File-based ingest** | `seed/accounts/*.json` (transcripts, emails, notes) → `seeder.py` → `retain()` | Judges need to see memory mechanics, not OAuth plumbing; synthetic data = full control of demo elements |
| **Groq LLM** | `openai/gpt-oss-120b` / `qwen/qwen3-32b` via API | Fast, free tier, function calling |
| **Hindsight Cloud** | `hindsight-client` SDK against cloud endpoint | Zero infra; UI to show memory internals live |

### Proposed roadmap (post-hackathon; this is the article/vision story)
| Priority | Integration | Data it feeds | Implementation sketch |
|---|---|---|---|
| P0 | **Notetaker exports** (Fathom/Granola/Fireflies/Gong CSV or API) | Transcripts + action items | Normalizer adapter per source → same `retain()` path; this turns incumbents into our ingest instead of competitors |
| P0 | **Gmail + Google Calendar** | Emails, meeting metadata | Google API → classify → retain with timestamps |
| P1 | **Salesforce / HubSpot (read-only)** | CRM fields | Powers the amnesia baseline for contrast; later: Waada briefing written back as a note |
| P1 | **Slack deal channels** | Internal chatter ("CFO pushing back") | Channel export/webhook → retain as internal-note interactions |
| P2 | **MCP server** exposing deal memory | — | Any agent (Claude Code, OpenClaw) can ask "brief me on Acme" — the Granola insight: *memory must be agent-addressable* |
| P2 | **Calendar hook** | Pre-meeting trigger | Auto-run `brief` 15 min before any call with a known account |

**Design rule:** every integration is just another *normalizer* feeding the same `retain()` contract (see §3). Adding a source never touches the memory core.

## 3. How we handle data

### 3.1 Ingest → retain contract

Every interaction, from any source, is normalized to:

```python
client.retain(
    bank_id="waada-<account-slug>",        # ONE BANK PER ACCOUNT
    content=<interaction text>,            # transcript excerpt / email body / note
    context="<type> — <title>",            # e.g. "Call #2 — pricing discussion"
    timestamp=<actual date of interaction>,# powers TEMPORAL recall
    document_id=<source-id>,               # groups memories by source interaction
    metadata={
        "type": "call|email|note|slack",
        "participants": ["Priya Nair", "Alex Rivera"],
        "account": "acme",
        "sentiment_hint": "positive|neutral|tense",   # optional
    },
    retain_async=False,                    # synchronous = deterministic demos
)
```

### 3.2 Bank design

- **Scoping:** one memory bank per account (`waada-acme-corp`) → zero cross-account leakage, trivial to delete, easy to show in the UI.
- **Mission** (set at `create_bank`): *"You are the continuity memory for a B2B sales deal. Track what the prospect said, what we promised, objections raised and how they were resolved, stakeholder roles and sentiment, and open commitments."*
- **Optional org-level bank** (`waada-playbook`): cross-account patterns from `reflect()` — the stretch goal.

### 3.3 What Hindsight does with it (the memory lifecycle)

```
raw interaction (chunk)
   → extracted FACTS
        world facts:      "Priya objected to monthly pricing" (Aug 12)
        experience facts: "Alex promised security docs to the CFO" (Sep 2)
   → ENTITY GRAPH:  Priya ─ champion ─ Acme ; David Chen ─ blocker ─ Acme
   → CONSOLIDATED OBSERVATIONS (reflect/worker):
        "Pricing objections on deals >$50K resolve with annual billing"
        conflict handling: champion changes jobs → supersedes, keeps history
   → KNOWLEDGE PAGES / MENTAL MODELS (curated playbook, optional)
```

### 3.4 Retrieval & synthesis (read path)

1. **Query planner** expands a command into targeted recalls — never one giant query:
   - `brief` → 4 queries: promises · objections+resolutions · stakeholders · recent changes
   - `ask "X"` → 1 focused recall (`budget="high"`, `include_chunks=True` for citations)
   - temporal questions route to the temporal arm ("since July", "last month")
2. **Context assembly:** dedupe, respect token budget, order by recency+relevance.
3. **LLM synthesis** (Groq) with a role-specific system prompt → output with explicit citations ("— Call #2, Aug 12").
4. **Landmine & promise detectors** run as dedicated recalls whose results are *required* in the briefing template.

### 3.5 Data quality & hygiene

| Concern | Handling |
|---|---|
| **Demo data** | Fully synthetic, per DATA_PLAN.md realism checklist; no real PII anywhere in the repo |
| **Production PII** (vision) | Redaction pass before retain; bank-per-account isolation; Hindsight bank deletion for account offboarding ("right to forget" = delete the bank) |
| **Stale facts** | Hindsight observation conflicts: new info supersedes old with history preserved (champion job change demo) |
| **Idempotency** | Seeder checks bank existence; `--reset` recreates; never double-seed during a demo |
| **Validation** | PIPELINE.md gates 1–7 must pass before demo polish |

## 4. The solution, summarized

1. **Capture is a solved problem; continuity isn't.** Gong records it, Fathom extracts it, the CRM gets the scraps a rep manually enters. When the rep leaves, none of it behaves like *memory*.
2. **Waada makes the deal, not the rep, the unit of memory.** One Hindsight bank per account; attributed, timestamped interactions; consolidated observations; temporal + graph recall.
3. **The handoff becomes a 10-second briefing** with landmine warnings and undelivered promises surfaced first — instead of a 3-week discovery restart.
4. **Measured outcome:** questions the new AE must re-ask: **7 → 0**.
5. **Integrations are adapters, not architecture** — every source normalizes into the same `retain()` contract, so the MVP ships in a day while the roadmap scales to the full sales stack.
