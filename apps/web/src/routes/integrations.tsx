import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { connectIntegration, disconnectIntegration, getIntegrations } from "../lib/server";

type Connection = "gmail" | "slack" | "hubspot" | "meet" | "mcp";
type DialogState = { name: Connection; title: string; prompt: string; label: string } | undefined;

const connectorCards: Array<{
  name: Connection;
  title: string;
  description: string;
  mark: string;
  prompt: string;
  label: string;
}> = [
  {
    name: "gmail",
    title: "Gmail",
    description: "Bring selected account conversations into one handoff.",
    mark: "G",
    prompt: "Sign in with Google to connect Gmail.",
    label: "Google workspace",
  },
  {
    name: "slack",
    title: "Slack",
    description: "Keep the decisions made between messages in view.",
    mark: "S",
    prompt: "Add Waada to the Slack workspace.",
    label: "Slack workspace",
  },
  {
    name: "hubspot",
    title: "HubSpot CRM",
    description: "Keep CRM context beside the account record.",
    mark: "H",
    prompt: "Add a HubSpot private app token.",
    label: "HubSpot portal",
  },
  {
    name: "meet",
    title: "Google Meet",
    description: "Capture meeting context through the Chrome extension.",
    mark: "M",
    prompt: "Install the Chrome extension to capture meeting context.",
    label: "Chrome extension",
  },
  {
    name: "mcp",
    title: "MCP server",
    description: "Make account context available inside Claude and Cursor.",
    mark: "⌘",
    prompt: "Copy this MCP configuration into your client.",
    label: "MCP client",
  },
];

export const Route = createFileRoute("/integrations")({
  loader: () => getIntegrations(),
  component: Integrations,
  errorComponent: ({ error }) => <ErrorPanel error={error} />,
});

function ErrorPanel({ error }: { error: unknown }) {
  return (
    <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-950">
      {error instanceof Error ? error.message : "Something went wrong. Check the server log."}
    </p>
  );
}

function Integrations() {
  const initial = Route.useLoaderData();
  const [data, setData] = useState(initial);
  const [dialog, setDialog] = useState<DialogState>();
  const [label, setLabel] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const saved = data.saved;
  async function connect() {
    if (!dialog) return;
    setBusy(true);
    setError("");
    try {
      const saved = await connectIntegration({
        data: { name: dialog.name, label: label.trim() || dialog.label },
      });
      setData((current) => ({ ...current, saved }));
      setDialog(undefined);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Something went wrong. Check the server log.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function disconnect(name: Connection) {
    setBusy(true);
    setError("");
    try {
      const saved = await disconnectIntegration({ data: { name } });
      setData((current) => ({ ...current, saved }));
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Something went wrong. Check the server log.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="max-w-3xl">
        <p className="text-xs font-bold tracking-[.16em] text-indigo-600">WORKSPACE</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Integrations</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-300">
          Choose the tools that belong in your account handoff.
        </p>
      </div>
      {error ? <ErrorPanel error={new Error(error)} /> : null}
      <IntegrationGroup
        title="Sources"
        cards={connectorCards}
        saved={saved}
        onConnect={(item) => {
          setLabel(item.label);
          setDialog(item);
        }}
        onDisconnect={disconnect}
        busy={busy}
      />
      <section className="mt-10">
        <GroupTitle>Memory</GroupTitle>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <StaticCard
            mark="H"
            title="Hindsight"
            description="A memory bank for every account, built for recall."
            status={data.hindsightConfigured ? "Connected" : "Set up"}
            action="Open settings"
          />
        </div>
      </section>
      <section className="mt-10">
        <GroupTitle>AI model</GroupTitle>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <StaticCard
            mark="G"
            title="Groq"
            description="Turns account history into an actionable handoff."
            status={data.groqConfigured ? "Connected" : "Set up"}
            action="Open settings"
          />
          <StaticCard
            mark="AI"
            title="Other providers"
            description="Choose OpenAI, Anthropic, Google, OpenRouter, or Ollama in Settings."
            status="Available"
            action="Open settings"
          />
        </div>
      </section>
      <section className="mt-10">
        <GroupTitle>Surfaces</GroupTitle>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <StaticCard
            mark="W"
            title="Web app"
            description="Review account continuity from the Waada workspace."
            status="Active"
            action="Open workspace"
          />
        </div>
      </section>
      {dialog ? (
        <div
          className="fixed inset-0 z-20 grid place-items-center bg-slate-950/45 p-4"
          role="presentation"
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="connect-title"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#1b2132]"
          >
            <h2 id="connect-title" className="text-xl font-semibold">
              Connect {dialog.title}
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{dialog.prompt}</p>
            {dialog.name === "mcp" ? (
              <pre className="mt-4 overflow-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100">{`{ "mcpServers": { "waada": { "command": "waada-mcp" } } }`}</pre>
            ) : null}
            <label className="mt-5 block text-sm font-medium">
              Connection label
              <input
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
              />
            </label>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDialog(undefined)}
                className="rounded-lg px-3 py-2 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={connect}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {busy ? "Saving" : "Connect"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}

function GroupTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-bold uppercase tracking-[.14em] text-slate-500">{children}</h2>
  );
}
function Status({ value }: { value: string }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${value === "Connected" || value === "Active" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}
    >
      {value}
    </span>
  );
}
function StaticCard({
  mark,
  title,
  description,
  status,
  action,
}: {
  mark: string;
  title: string;
  description: string;
  status: string;
  action: string;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#171d2c]">
      <div className="flex items-start gap-3">
        <Mark>{mark}</Mark>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold">{title}</h3>
            <Status value={status} />
          </div>
          <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">{description}</p>
          <button
            type="button"
            className="mt-4 text-sm font-semibold text-indigo-700 dark:text-indigo-300"
          >
            {action}
          </button>
        </div>
      </div>
    </article>
  );
}
function Mark({ children }: { children: React.ReactNode }) {
  return (
    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-indigo-50 text-sm font-bold text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
      {children}
    </span>
  );
}
function IntegrationGroup({
  title,
  cards,
  saved,
  onConnect,
  onDisconnect,
  busy,
}: {
  title: string;
  cards: typeof connectorCards;
  saved: Record<string, { connected: boolean; label?: string }>;
  onConnect: (item: (typeof connectorCards)[number]) => void;
  onDisconnect: (name: Connection) => void;
  busy: boolean;
}) {
  return (
    <section className="mt-10">
      <GroupTitle>{title}</GroupTitle>
      <div className="mt-3 grid gap-4 md:grid-cols-2">
        {cards.map((item) => {
          const connection = saved[item.name];
          const connected = connection?.connected;
          return (
            <article
              key={item.name}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#171d2c]"
            >
              <div className="flex items-start gap-3">
                <Mark>{item.mark}</Mark>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold">{item.title}</h3>
                    <Status value={connected ? "Connected" : "Set up"} />
                  </div>
                  <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">
                    {item.description}
                  </p>
                  {connected ? (
                    <div className="mt-4 flex items-center gap-3">
                      <span className="text-sm text-slate-500">{connection.label}</span>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => onDisconnect(item.name)}
                        className="text-sm font-semibold text-rose-700 disabled:opacity-60 dark:text-rose-300"
                      >
                        Disconnect
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onConnect(item)}
                      className="mt-4 text-sm font-semibold text-indigo-700 disabled:opacity-60 dark:text-indigo-300"
                    >
                      Connect
                    </button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
