# Market Analysis — Current Solutions & Where Waada Fits

What exists today, what it integrates, and — honestly — **where Waada overlaps and where it doesn't**.

> **Bottom line:** "Ingest email + Slack + meetings → AI account summary" is a crowded category in 2026 (Day.ai, Read AI, AskElephant, Momentum, Backstory, Agentforce). Waada does **not** compete on capture or summaries. Its intended focus is three things we did **not find** as advertised features in the sources checked: a **promise ledger** (open / delivered / overdue), **landmine warnings** (resolved objections not to re-open), and **change-aware recall** ("what changed since July?"). This is based on a limited search of public material on 2026-09-27, not hands-on product testing.

---

## 1. Category map

| Category | Players | What they capture | Key integrations |
|---|---|---|---|
| **Customer-memory / AI-native CRM** | **Day.ai** | Email, calendar, meetings, Slack, notes → "Customer Memory" ontology | Google/Microsoft mail & calendar, Slack, meeting capture; is itself a CRM |
| **Deal handoff tools** | **AskElephant** | Calls, emails, CRM notes → auto "Handoff Package" (stakeholders, pains, promised timeline) | CRM, call recording, email |
| **Cross-platform meeting intelligence** | **Read AI** | Meetings + email + Slack stitched into one narrative; marketed as insurance when reps leave | Zoom/Meet/Teams, Gmail/Outlook, Slack |
| **Revenue orchestration** | **Momentum.io**, **Backstory** | Call insights, signals, deal risk; briefs pushed to Slack/email | Salesforce, HubSpot, Zoom, Slack, calendars |
| **CRM-native AI** | **Salesforce Agentforce + Einstein Activity Capture**, HubSpot Breeze | Email/calendar activity; account briefs in Slack canvases | Their own CRM + Slack |
| **Conversation intelligence** | Gong, Chorus, Clari | Calls, transcripts, talk patterns | Salesforce, HubSpot, Dynamics, email, video |
| **AI meeting notetakers** | Fathom, Granola, Fireflies, Otter | Meetings, summaries, action items | CRM sync (paid tiers), Slack, Notion; Granola exposes MCP |
| **Agent memory infrastructure** | **Hindsight**, Mem0, Zep, LangMem | Nothing by themselves — SDKs for builders | APIs |

## 2. The closest competitors, in detail

### Day.ai — the closest in spirit
- Builds a "Customer Memory" from automatically permissioned ingestion of the team's **email, calendar, meetings and Slack**; people and AI agents query it ([day.ai](https://day.ai/), [folk.app review](https://www.folk.app/articles/day-ai-review)).
- **Where it stops for our use case:** it *is* a CRM — adopting it means migrating off Salesforce/HubSpot. Memory is a general account knowledge base; no explicit promise-status tracking or "don't re-open" guidance at handoff.

### AskElephant — the closest on the handoff moment
- Scans calls, emails and CRM notes to auto-generate a **Handoff Package**: stakeholders, discovery pain points, the implementation timeline the AE promised — delivered to the CSM before kickoff ([changeconnect.ca](https://www.changeconnect.ca/post/8-ai-tools-for-sales-to-success-handoffs-securing-the-second-sale-in-2026)).
- **Where it stops:** a point-in-time document for the **Sales → CS** transition. It *lists* what was promised; it doesn't track whether each promise was **kept**, and it isn't built for the unplanned AE → AE transfer when someone quits.

### Read AI — same pitch, broader product
- Connects meetings, email threads and Slack messages into one story; explicitly positioned as "intelligence insurance when reps leave or transition accounts" ([read.ai](https://www.read.ai/articles/ai-for-sales-teams)).
- **Where it stops:** a productivity/meeting platform first; the handoff is a benefit, not the product. Recall is summary/search over captured content.

### Momentum.io / Backstory — signals & orchestration
- Momentum pushes deal updates, signals and executive briefings into Slack and email and writes back to CRM ([momentum.io](https://www.momentum.io/integration)). Backstory turns meetings/emails into relationship context and deal-risk signals ([sifthub.io](https://www.sifthub.io/blog/ai-sales-tools)).
- **Where they stop:** optimized for the rep still on the deal (coaching, risk, next steps), not the successor.

### Salesforce Agentforce + Einstein Activity Capture — the incumbent default
- EAC captures email/calendar activity (now syncable as standard Activities since Summer '25); Agentforce builds account briefs in Slack with recent activity and next steps ([salesforcebreak.com](https://salesforcebreak.com/2026/03/04/einstein-activity-capture-guide/), [slack.com](https://slack.com/blog/news/conversational-intelligence-with-slack)).
- **Where it stops:** only for Salesforce shops, only as good as captured activity; briefs summarize, they don't reason about resolved-vs-open or kept-vs-broken.

### Gong / notetakers — capture without continuity
- Gong logs summaries as CRM activities; qualification data still re-entered by reps ([oliv.ai](https://www.oliv.ai/blog/gong-crm-integration)). Notetakers "stop at extraction… items still land as flat text" ([hirekai.ai](https://hirekai.ai/blog/fathom-vs-granola)). Memory is typically per-user.

## 3. The gap matrix

**Legend (read carefully — this is evidence, not a verdict):**
✅ = stated in the public source cited in §2 · ❓ = **not found** in the sources we checked (the feature may still exist — absence of evidence is not evidence of absence) · 🎯 = Waada **design goal, not yet built or measured**.

| Capability | Day.ai | AskElephant | Read AI | Agentforce + EAC | Gong / notetakers | **Waada** |
|---|---|---|---|---|---|---|
| Ingests email + Slack + meetings | ✅ | ✅ calls, email, CRM notes | ✅ | ✅ email/calendar; Slack surface | ✅ calls; notetaker-dependent | 🎯 import adapters |
| Account-level (not per-rep) memory | ✅ | ✅ | ✅ | ✅ | ❓ | 🎯 one bank per account |
| Handoff document / brief | ❓ | ✅ Sales→CS | ✅ positioned for rep transitions | ✅ account briefs | ❓ | 🎯 |
| Lists promises made | ❓ | ✅ "timeline promised by the AE" | ❓ | ❓ | ✅ action items | 🎯 |
| **Tracks each promise's status (open / delivered / overdue) over time** | ❓ | ❓ | ❓ | ❓ | ❓ ("stop at extraction" per hirekai.ai) | 🎯 |
| **Explicit "resolved — don't re-open" warnings** | ❓ | ❓ | ❓ | ❓ | ❓ | 🎯 |
| **"What changed since X?" queries** | ❓ | ❓ | ❓ | ❓ | ❓ | 🎯 via Hindsight temporal retrieval |
| Requires replacing your CRM | ✅ yes, it is a CRM | ❓ | no | no, but requires Salesforce | no | 🎯 no |
| Memory layer is open-source / self-hostable | ❓ | ❓ | ❓ | ❓ | ❓ | ✅ Hindsight is open-source (github.com/vectorize-io/hindsight) |

## 4. Positioning

**Table stakes (everyone has it — we implement it, we don't pitch it):** email / Slack / transcript ingestion, account summaries, Q&A over history.

**Waada's wedge:**
1. **Promise ledger** — every commitment the team made, who made it, to whom, when, and whether a later interaction fulfilled it. The name is the feature: *Waada* = promise.
2. **Landmines** — resolved objections and sensitive topics, with the resolution and date, surfaced as *"do not re-open."* Summaries tell you what happened; landmines tell you what **not to do**.
3. **Change-aware memory** — Hindsight's temporal retrieval and observation consolidation answer *"what changed since July?"* and keep old truths as history when new ones supersede them.
4. **Complement, not replacement** — sits beside Salesforce/HubSpot/Gong; built on open-source memory, so deal data can stay in your own infrastructure.

> **One-liner:** *Summaries tell you what happened. Waada tells you what you owe — and what not to say.*

## 5. Honest risks

| Risk | Response |
|---|---|
| Day.ai / AskElephant add promise tracking | Likely eventually. Our defensibility for now is focus + the memory model (temporal, consolidated, conflict-aware), not a moat. |
| "Just a feature of the CRM" | True long-term for many buyers. Waada's path: MCP server / API so any CRM agent can query the ledger. |
| Data access at departure | Companies own the departed rep's mailbox, recordings and Slack — import from exports; no rep cooperation needed. |

---

*Sources accessed 2026-09-27. Competitor capabilities summarized from vendor sites and third-party reviews; verify before citing externally.*
