# M07 — MCP server (stdio)

**Goal:** make deal memory usable by any MCP client (Claude Desktop, Claude Code, Codex, OpenCode) through the official MCP TypeScript SDK. **stdio only** in the MVP (S8). Streamable HTTP comes later with auth.

## Files you own

```
packages/mcp/**      (package.json with a "bin": "waada-mcp", src/index.ts, src/tools.ts, test/*)
docs/mcp.md          client setup snippets
```
Dependencies: the official MCP TypeScript SDK (S8), `@waada/core` (workspace), `zod`.

## Tools

| Tool | Input (Zod) | Calls | Returns |
|---|---|---|---|
| `list_accounts` | — | `listAccounts` | slugs + names |
| `brief` | `{ account }` | `brief` | markdown |
| `list_commitments` | `{ account, status?: "open" \| "delivered" \| "unclear" }` | `commitmentLedger` (filtered) | JSON + a short text summary |
| `list_landmines` | `{ account }` | `landmines` | JSON + text |
| `ask` | `{ account, question }` | `ask` | answer + citations |
| `compare` | `{ account }` | `compare` | three sections |
| `import_path` | `{ account, path }` (local file or folder) | read files → `parseFiles` → `ingest` | IngestReport |

Tool descriptions matter: agents choose tools from them. Write them for an AI reader, e.g. *"Returns commitments our team made to the customer on this account, with status open/delivered/unclear. Use before contacting the customer."*

## Rules

- **Nothing may write to stdout except the MCP protocol.** All logs go to stderr (core's `log.ts` already does).
- `WaadaError` → an MCP tool error result with the message. Never crash the server process.
- `import_path` only reads files the user points at. No network, no deleting.

## Acceptance

- [ ] Tests: each tool calls the right core function (inject fakes) and maps errors
- [ ] Manual run with the MCP Inspector: list tools, call `brief` on `acme`. Paste the output.
- [ ] `docs/mcp.md`: config snippets for Claude Code (`claude mcp add`), Claude Desktop, Codex and OpenCode, each **verified against that client's current docs** (link them)

## References

MCP TypeScript SDK: https://github.com/modelcontextprotocol/typescript-sdk · MCP spec: https://modelcontextprotocol.io · MCP Inspector: https://github.com/modelcontextprotocol/inspector
