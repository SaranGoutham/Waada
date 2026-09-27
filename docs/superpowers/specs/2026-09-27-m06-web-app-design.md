# M06 Web app design

**Brief:** `tasks/M06-web-app.md` · **Plan:** `docs/superpowers/plans/2026-09-27-m06-web-app.md`

The approved Brief and Import wireframes establish a focused, local-first sales handoff interface. A shared shell supplies account navigation and a Settings link. Each account page uses the account slug in the URL, preserving deep links during a handoff.

Until M05 is available, `WAADA_FAKE_CORE=1` selects deterministic sample Brief, Answer, and Compare data. Every page using that data has a persistent, high-contrast “Sample data” banner. Accounts, LLM settings, parsing, and ingest use the real core exports now. Server functions are the only web-to-core boundary and translate `WaadaError` into its safe user-facing message.

The import flow reads browser `File` objects into `Uint8Array`, calls `parseFiles`, renders a review table, and submits the accepted interactions to `ingest`. The Brief flow deliberately orders open commitments before landmines and the generated narrative, matching the product’s handoff priority.

No connector controls, Report page, OAuth/sign-in controls, or capture route are included in this MVP implementation.
