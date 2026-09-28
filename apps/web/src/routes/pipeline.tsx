import { createFileRoute } from "@tanstack/react-router";
import { getAccounts, getPipelineStats } from "../lib/server";

export const Route = createFileRoute("/pipeline")({
  loader: async () => {
    const accounts = await getAccounts();
    const account = accounts[0];
    return {
      accounts,
      stats: account ? await getPipelineStats({ data: { account: account.slug } }) : undefined,
    };
  },
  component: Pipeline,
  errorComponent: ({ error }) => (
    <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-950">
      {error instanceof Error ? error.message : "Something went wrong. Check the server log."}
    </p>
  ),
});
function Pipeline() {
  const { accounts, stats } = Route.useLoaderData();
  const labels = ["Sources", "Ingest", "Memory", "Agent", "Surfaces"];
  return (
    <>
      <p className="text-xs font-bold tracking-[.16em] text-indigo-600">WORKSPACE</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Pipeline</h1>
      <p className="mt-2 max-w-2xl text-slate-600 dark:text-slate-300">
        A clear path from account history to the next conversation.
      </p>
      <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#171d2c]">
        <div className="flex min-w-[720px] items-center justify-between gap-2">
          {labels.map((label, index) => (
            <div key={label} className="contents">
              <div className="w-28 rounded-xl border border-indigo-100 bg-indigo-50 p-3 text-center dark:border-indigo-500/20 dark:bg-indigo-500/10">
                <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
                  {label}
                </span>
                <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-300">
                  {
                    [
                      "Gmail · Slack · CRM · Meet · uploads",
                      "Parse · dates · people · dedupe",
                      "One bank per account",
                      "Commitments · landmines · brief · ask",
                      "Web app · MCP",
                    ][index]
                  }
                </p>
              </div>
              {index < labels.length - 1 ? (
                <span aria-hidden="true" className="flow-dot text-lg text-indigo-400">
                  →
                </span>
              ) : null}
            </div>
          ))}
        </div>
      </section>
      {stats ? (
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Stat value={stats.interactions} label="Interactions stored" />
          <Stat value={stats.openCommitments} label="Open commitments" />
        </div>
      ) : (
        <p className="mt-5 rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
          Create an account to see its pipeline.
        </p>
      )}
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {[
          ["Collect", "Bring exported emails, messages, calls, and account records together."],
          [
            "Prepare",
            "Waada reads the date, participants, and source while avoiding duplicate history.",
          ],
          ["Remember", "Each account keeps its own memory bank, so retrieval stays focused."],
          [
            "Act",
            "The handoff starts with open promises and settled objections, then answers questions with sources.",
          ],
        ].map(([title, text]) => (
          <article
            key={title}
            className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#171d2c]"
          >
            <h2 className="font-semibold">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{text}</p>
          </article>
        ))}
      </div>
      {accounts.length ? (
        <p className="mt-6 text-sm text-slate-500">
          Showing workspace context for {accounts[0]?.name}.
        </p>
      ) : null}
    </>
  );
}
function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-2xl bg-indigo-600 p-5 text-white">
      <p className="text-3xl font-semibold">{value}</p>
      <p className="mt-1 text-sm text-indigo-100">{label}</p>
    </div>
  );
}
