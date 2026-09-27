# Proposals & Open Questions (awaiting the human)

Agents **append** here when they need a stack addition (AGENTS.md rule 3), a contract change (rule 2), or any decision their brief doesn't settle. The human answers inline and sets the status. After approval, the proposing agent records the outcome as an ADR in `docs/decisions/NNNN-short-title.md` and, for stack items, the human updates AGENTS.md §5.

**Template**

```
## P-NNN — <short title>
- Raised by: <module> (<agent>) · <date>
- Type: stack | contract | design
- Question / proposal:
- Why it's needed:
- Options considered (with trade-offs):
- Recommendation:
- Blocks: <what can't proceed>
- **Status:** open | approved: <choice> | rejected
- Human answer:
```

---

## P-001 — Library for parsing `.eml` email files
- Raised by: planning (Claude Code) · 2026-09-27
- Type: stack
- Question / proposal: M03 must parse `.eml` files (headers, MIME multipart, quoted-printable/base64 bodies, attachments names). Hand-rolling MIME parsing is error-prone.
- Options considered:
  - `postal-mime`: small, no dependencies, works in Node and browser, parses to headers + text/html + attachments.
  - `mailparser` (Nodemailer project): mature and widely used, Node-only, heavier.
  - Hand-rolled with Node built-ins: no dependency, but high risk of bugs on real exports.
- Recommendation: `postal-mime` (smaller, no dependencies), but either library is fine.
- Blocks: M03 `.eml` parser only (Slack export, transcripts and audio can proceed).
- **Status:** approved: `postal-mime`
- Human answer: postal-mime (2026-09-27)

## P-002 — Ollama provider package for the AI SDK
- Raised by: planning (Claude Code) · 2026-09-27
- Type: stack
- Question / proposal: S3 approves Ollama as a provider, but the AI SDK has no first-party Ollama provider; it is listed under community providers. Which package?
- Options considered: M02 checks the AI SDK community-providers page for the currently maintained Ollama provider and lists the candidates here, including maintenance status (last release, downloads). Alternative: Ollama's OpenAI-compatible endpoint via the AI SDK's OpenAI-compatible provider, with no extra community package.
- Recommendation: pending M02's research. The OpenAI-compatible route avoids a community dependency.
- Blocks: the Ollama option in M02 only
- **Status:** approved: Ollama via its OpenAI-compatible endpoint (`http://localhost:11434/v1`) using `@ai-sdk/openai-compatible`
- Human answer: use the OpenAI-compatible route; package `@ai-sdk/openai-compatible` (2026-09-27)
