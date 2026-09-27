# Waada (वादा)

> ***Waada* — Hindi for "promise."**
> **When a sales rep leaves, the deal's memory shouldn't leave with them. Every promise remembered, every handoff seamless.**

Waada is a **deal-continuity agent** that gives every sales account a persistent, transferable memory. When an AE quits, goes on leave, or hands a deal off, the new owner picks up *mid-conversation* — instead of restarting discovery and re-asking questions the prospect already answered.

Built on [Hindsight](https://github.com/vectorize-io/hindsight), the open-source memory system for AI agents.

---

## The problem in one paragraph

Replacing a sales rep costs ~$115K and 189 days. But the bigger loss is invisible: objections overcome, promises made, stakeholder dynamics, and the prospect's own words live **in the departing rep's head** — not in CRM fields. New owners restart discovery, re-raise already-resolved objections, and deals stall or die within days of a handoff.

## What Waada does

| Capability | How |
|---|---|
| **Retains every interaction** | Call transcripts, emails, and notes go into a per-account Hindsight memory bank via `retain()` |
| **Briefs new owners in seconds** | Natural-language `recall()` — including temporal queries like *"what changed since July?"* |
| **Flags landmines** | *"Don't re-open the pricing objection — resolved Aug 12 with annual billing"* |
| **Tracks undelivered promises** | *"Alex promised security docs on Sep 2 — still undelivered. Do this first."* |
| **Learns deal patterns** | `reflect()` consolidates observations across interactions |

**Demo metric:** questions the new AE would re-ask: **7 → 0**.

## Planned repo structure

```
waada/
├── README.md                  # You are here
├── PROBLEM_STATEMENT.md       # Problem, evidence, judging mapping
├── ARCHITECTURE.md            # Components, memory design, data flow
├── SETUP.md                   # Environment setup (Hindsight Cloud + Groq)
├── TASKS.md                   # Build checklist (do these in order)
├── PIPELINE.md                # Approach methodology + end-to-end pipeline
├── MARKET_ANALYSIS.md         # Current solutions, their integrations, the gap
├── SOLUTION_DESIGN.md         # What we propose + integrations + data handling
├── WORKFLOW.md                # ⭐ Read this first — full workflow + component guide
├── DATA_PLAN.md               # Synthetic data spec
├── DEMO_SCRIPT.md             # 60-second demo + video script
├── .env.example               # Required environment variables
├── requirements.txt
├── waada/
│   ├── __init__.py
│   ├── config.py              # Env vars, model names, bank naming
│   ├── memory.py              # Hindsight wrapper (retain/recall/reflect)
│   ├── llm.py                 # Groq client + function-calling retry logic
│   ├── agent.py               # Briefing / Q&A / handoff-report logic
│   ├── prompts.py             # System prompts for each command
│   └── cli.py                 # Typer CLI entry point
├── seed/
│   ├── accounts/              # Synthetic account JSON files
│   └── seeder.py              # Loads accounts into Hindsight banks
└── tests/
    └── test_smoke.py          # retain → recall smoke test
```

## Quickstart

```bash
# 1. Create environment
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate

# 2. Install deps
pip install hindsight-client groq python-dotenv typer rich

# 3. Configure secrets (see SETUP.md)
cp .env.example .env   # then fill in HINDSIGHT_API_KEY + GROQ_API_KEY

# 4. Seed a synthetic account into Hindsight
python -m seed.seeder --account acme

# 5. Run Waada
python -m waada.cli brief acme
python -m waada.cli ask acme "What did we promise Priya?"
python -m waada.cli handoff-report acme
python -m waada.cli amnesia acme      # the memory-less baseline for contrast
```

Full setup instructions → **[SETUP.md](SETUP.md)** · Understand the process first → **[WORKFLOW.md](WORKFLOW.md)** · Build order → **[TASKS.md](TASKS.md)** · Approach & pipeline → **[PIPELINE.md](PIPELINE.md)**

## Tech stack

- **Python 3.11+**
- **Memory:** [Hindsight](https://github.com/vectorize-io/hindsight) ([docs](https://hindsight.vectorize.io/)) — `retain()` / `recall()` / `reflect()` with temporal, semantic, keyword, and entity-graph retrieval
- **LLM:** Groq — recommended models `openai/gpt-oss-120b` or `qwen/qwen3-32b` (handle function-calling errors gracefully!)
- **CLI:** Typer + Rich

## Learn more

- Hindsight GitHub: https://github.com/vectorize-io/hindsight
- Hindsight docs: https://hindsight.vectorize.io/
- What is agent memory: https://vectorize.io/what-is-agent-memory

## License

MIT
# Waada
