# Setup Guide

Everything you need to run Waada locally in VS Code. Estimated time: **20 minutes**.

---

## 1. Prerequisites

- **Python 3.11+** — check with `python --version`
- **VS Code** with extensions:
  - *Python* (Microsoft) + *Pylance*
  - *Markdown All in One* (nice for these docs)
  - *Even Better TOML* (optional)
- **Git**

## 2. Initialize the project

```bash
mkdir waada && cd waada
git init
python -m venv .venv

# Activate:
# macOS/Linux:
source .venv/bin/activate
# Windows (PowerShell):
# .venv\Scripts\Activate.ps1

pip install hindsight-client groq python-dotenv typer rich
pip freeze > requirements.txt
```

Recommended `.gitignore`:

```
.venv/
.env
__pycache__/
*.pyc
```

## 3. Get a Hindsight instance

**Option A — Hindsight Cloud (fastest):**
1. Register at **https://ui.hindsight.vectorize.io**
2. Apply promo code **`MEMHACK99`** in the **Billing** section → $50 free credits
3. Create an **API key** in the dashboard (Settings → API Keys)
4. Note the **API endpoint URL** shown in the dashboard

**Option B — Open-source locally (Docker):** follow the installation guide at https://hindsight.vectorize.io/developer/installation — the server defaults to `http://localhost:8888`.

**Option C — Embedded (no server):** `pip install hindsight-all` runs a Hindsight server inside your Python process — handy for smoke tests. See https://hindsight.vectorize.io/sdks/hindsight-all

## 4. Get a Groq API key

1. Sign up at **https://groq.com/** → create an API key in the console
2. Recommended models: `openai/gpt-oss-120b` or `qwen/qwen3-32b` (generous free tier, very fast)

## 5. Configure environment

Copy `.env.example` → `.env` and fill it in:

```bash
cp .env.example .env
```

| Variable | What it is |
|---|---|
| `HINDSIGHT_BASE_URL` | Cloud endpoint from the dashboard, or `http://localhost:8888` for local |
| `HINDSIGHT_API_KEY` | Your Hindsight Cloud API key (leave blank for local OSS without auth) |
| `GROQ_API_KEY` | Your Groq API key |
| `WAADA_LLM_MODEL` | `openai/gpt-oss-120b` (default) or `qwen/qwen3-32b` |

## 6. Smoke test

Create `tests/test_smoke.py` (or run inline) to verify the whole chain:

```python
from hindsight_client import Hindsight

client = Hindsight(
    base_url="<your HINDSIGHT_BASE_URL>",
    api_key="<your HINDSIGHT_API_KEY>",   # omit for local OSS without auth
)

client.retain(bank_id="waada-smoke-test", content="Priya is the champion for the Acme deal.")
results = client.recall(bank_id="waada-smoke-test", query="Who is the champion?")
for r in results.results:
    print(r.text)
```

```bash
python tests/test_smoke.py
# Expect: "Priya is the champion for the Acme deal." (or close paraphrase)
```

✅ If that prints, your memory layer works — proceed to **TASKS.md**.

## Troubleshooting

| Symptom | Fix |
|---|---|
| 401/403 from Hindsight | API key missing/wrong; confirm the key + endpoint match the dashboard |
| Connection refused (local) | Server not running — `docker ps`; check https://hindsight.vectorize.io/developer/installation |
| Groq 400 on function calling | Expected sometimes — ensure `llm.py` retries and falls back to plain completion (see ARCHITECTURE.md) |
| Slow first recall | Hindsight consolidates on write; give seeding a moment to finish (`retain_async=False` keeps it synchronous) |

## Key references

- Hindsight docs: https://hindsight.vectorize.io/
- Python SDK: https://hindsight.vectorize.io/sdks/python
- GitHub: https://github.com/vectorize-io/hindsight
- Agent memory primer: https://vectorize.io/what-is-agent-memory
