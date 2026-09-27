# Architecture

> ⚠️ **Partly outdated (2026-09-27).** The stack moved to **TypeScript** (TanStack Start, AI SDK, pnpm; no CLI). For the stack, contracts and repo layout, **[AGENTS.md](AGENTS.md) §5–§7 win.** The Python file names, `Typer`, `Streamlit`, `FastAPI` and `groq` references below are superseded. The *design ideas* still apply: one bank per account, the `Interaction` → `retain()` contract, the read path per feature, the baselines, live capture. M10 rewrites this file.

## Design rule

**Every source is an adapter that produces the same `Interaction` object. Every `Interaction` goes through one ingest path into `retain()`.** Adding a source (Gmail, Slack, a Meet transcript, a phone recording) never touches memory or agent code.

## High-level view

```
 SOURCES (adapters)                         CORE                                SURFACES
┌──────────────────────────┐   ┌───────────────────────────────────┐   ┌──────────────────────┐
│ Files (exports)          │   │ ingest/pipeline.py                │   │ CLI (Typer)          │
│  .eml · Slack JSON · .txt│   │  Interaction → dedupe → retain()  │   │ Web UI (Streamlit)   │
│ Connectors (live APIs)   │──▶│                                   │   │ MCP server (stdio)   │
│  Gmail · Slack · HubSpot │   │ memory.py ── Hindsight ──┐        │◀──│ Capture API (FastAPI)│
│ Capture                  │   │   retain / recall / reflect       │   │  ◀─ Meet extension   │
│  Meet extension · audio  │   │ agent.py                          │   └──────────────────────┘
│  upload (Whisper)        │   │  brief · promise ledger ·         │
└──────────────────────────┘   │  landmines · ask · report ·       │
                               │  baselines (CRM-only, summary)    │
                               │ llm.py ── Groq (tool-call retry)  │
                               └───────────────────────────────────┘
                                              │
                                              ▼
                         ┌──────────────────────────────────────────┐
                         │   HINDSIGHT (Cloud or OSS)               │
                         │   one bank per account: waada-<slug>     │
                         │   facts · entity graph · temporal index  │
                         │   observations (reflect)                 │
                         └──────────────────────────────────────────┘
```

## Package layout

```
waada/
├── config.py            # .env loading + validation; bank_id_for(account)
├── models.py            # Interaction, Promise, Landmine dataclasses
├── memory.py            # ONLY module that talks to Hindsight
├── llm.py               # ONLY module that talks to Groq (chat, tool calls w/ retry, Whisper)
├── prompts.py           # System prompts, versioned
├── agent.py             # brief / ledger / landmines / ask / report / baselines
├── ingest/
│   ├── pipeline.py      # ingest(interactions) → dedupe → memory.remember()
│   ├── eml.py           # .eml files → Interaction (stdlib email; no LLM)
│   ├── slack_export.py  # Slack channel-export JSON → Interaction (grouped by day)
│   ├── transcript.py    # .txt/.vtt transcripts → Interaction (LLM extracts date/participants if no header)
│   └── audio.py         # audio file → Groq Whisper → transcript → Interaction
├── connectors/
│   ├── gmail.py         # Gmail API (Google OAuth desktop flow) → Interaction
│   ├── slack_api.py     # Slack bot token, conversations.history → Interaction
│   └── hubspot.py       # HubSpot private-app token: deal fields (for baseline) + notes/emails
├── cli.py               # Typer: import, brief, promises, ask, report, compare, connect-*
├── app.py               # Streamlit: Import · Brief · Ask · Compare tabs
├── mcp_server.py        # MCP tools: brief, ask, list_promises, list_landmines, import_path
└── capture_api.py       # FastAPI: POST /capture/meet (from the browser extension)
extension/meet-capture/  # Chrome MV3 extension: reads Meet live captions → capture_api
seed/acme/ · seed/nova/  # Synthetic export files (.eml, Slack JSON, .txt) — see DATA_PLAN.md
tests/
```

**Dependency rule:** only `memory.py` imports `hindsight_client`; only `llm.py` imports `groq`. Surfaces only call `agent.py` and `ingest/`.

## The `Interaction` contract

```python
@dataclass
class Interaction:
    account: str            # "acme"
    source_id: str          # stable: Message-ID, slack channel+date, file hash → Hindsight document_id
    type: str               # call | email | slack | note | meeting
    date: datetime          # REAL interaction time → timestamp (powers temporal recall)
    title: str              # "Call #2 — pricing discussion"
    participants: list[str]
    content: str
```

`memory.remember()` maps it to:

```python
client.retain(
    bank_id=f"waada-{account}",
    content=content,
    context=f"{type} — {title}",
    timestamp=date,
    document_id=source_id,
    metadata={"type": type, "participants": ..., "account": account, "source": adapter_name},
)
```

**Dedupe:** the ingest pipeline keeps a local manifest (`.waada/manifest.json`) of `source_id`s already retained per account, so re-importing the same folder or re-syncing a connector is a no-op. *(Hindsight's own behaviour on repeated `document_id` is to be verified in the smoke test; the manifest makes us independent of it.)*

## Memory bank design

- **One bank per account** (`waada-acme`) — scoped retrieval, no cross-account leakage, "forget this account" = delete the bank.
- **Mission** set on bank creation: *"You are the continuity memory for a B2B sales deal. Track what the prospect said, what our team promised and whether it was delivered, objections raised and how they were resolved, stakeholder roles and sentiment, and how things changed over time."*
- **Optional playbook bank** (`waada-playbook`) for cross-account `reflect()` patterns.

## Read path — what each feature does

| Feature | Recall queries | LLM step | Output |
|---|---|---|---|
| **Promise ledger** | "commitments our team made", "documents/materials sent or delivered", "follow-ups owed" | Tool call → `list[Promise]` with `status: open | delivered | unclear` + evidence citation | Table; open first |
| **Landmines** | "objections raised and how resolved", "sensitive topics / things the prospect disliked" | Tool call → `list[Landmine]` (topic, resolution, date, source) | "Do NOT re-open …" list |
| **Brief** | ledger + landmines + "stakeholders, roles, sentiment" + "recent changes" | Briefing prompt | Open promises → landmines → stakeholders → story → prospect's words |
| **Ask** | 1 recall (`budget="high"`) | Answer with citations | Text |
| **Report** | Brief inputs + `reflect()` on cross-cutting questions | Report prompt | Markdown document incl. "learned patterns" |

Promise status is **derived each time** from memory (a later email "attached the SOC 2 report" flips the Sep 2 promise to delivered). Hindsight is the single source of truth; nothing is cached as authoritative.

## Baselines (proof that memory matters)

| Mode | Input to the same LLM | Purpose |
|---|---|---|
| `crm` | CRM fields only (from HubSpot or the seed's `crm.json`) | What survives a departure today |
| `summary` | **All raw interaction text**, concatenated (truncated to model context), no Hindsight | The honest competitor-style comparison: "an LLM summarizing everything" |
| `waada` | Targeted recalls + ledger + landmines | Ours |

`compare` runs all three and shows them side by side. If `waada` is not clearly better than `summary` on the long Acme history, the memory layer isn't earning its place — this is a gate, not a formality.

## LLM layer (Groq)

- Default `openai/gpt-oss-120b`; fallback `qwen/qwen3-32b` (configurable).
- **Tool calls:** parse → validate against schema → on failure retry once with a repair prompt that includes the schema → on second failure fall back to plain-JSON completion → on third failure return empty result + warning. Never crash a surface on a malformed tool call.
- Temperature ~0.2 for extraction/ledger, ~0.3 for briefings.
- Speech-to-text for `audio.py` via Groq's Whisper endpoint *(model name to be confirmed against Groq's current model list)*.

## Surfaces

- **CLI** — developer and demo surface. Same functions as the UI.
- **Streamlit** — the sales-user surface: drag-and-drop import, brief, ask, side-by-side compare.
- **MCP server** — stdio transport, local only. Lets Claude Desktop / Claude Code / any MCP client call `brief`, `ask`, `list_promises`, `list_landmines`.
- **Capture API** — FastAPI on `localhost`, receives Meet caption batches from the extension, assembles a transcript per meeting, ingests it at meeting end.

**No authentication in the MVP.** Consequence: MCP runs over stdio and the capture API binds to `127.0.0.1` only. Neither is safe to expose publicly until auth exists.

## Real-time capture

- **Google Meet:** Chrome MV3 extension observes Meet's live-caption DOM, batches `{speaker, text, time}` to `POST /capture/meet`. On "end meeting", the API builds a transcript `Interaction` and ingests it. Fragile by nature (depends on Meet's DOM) — isolated in one content script so breakage is contained.
- **Phone calls (MVP):** upload the recording → Whisper → ingest.
- **Phone calls (roadmap):** Twilio number + Media Streams for live audio → streaming transcription → ingest at hang-up; or dialer APIs (Aircall, RingCentral) for recordings.
- **Consent:** the extension shows a visible indicator and the docs require announcing transcription to all participants. Call recording is subject to consent laws (some jurisdictions require all-party consent).

## Error handling & robustness

- `.env` validated at startup, per feature (e.g. Slack commands only require `SLACK_BOT_TOKEN`).
- Hindsight/Groq/connector calls: timeout, one retry with backoff, friendly message — no stack traces on any surface.
- Imports are idempotent (manifest); `--reset` deletes and recreates the bank.

## Stretch (only if ahead)

1. Contradiction demo: champion changes jobs → briefing reflects new reality, history kept.
2. Cross-deal playbook bank via `reflect()`.
3. Twilio live-call capture.
