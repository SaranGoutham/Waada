import { Archive, Brain, FileArrowUp, MagicWand, MonitorPlay } from "@phosphor-icons/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { formatDate } from "../lib/format";
import { getAccounts, getPipelineStats } from "../lib/server";

export const Route = createFileRoute("/pipeline")({
  validateSearch: z.object({ account: z.string().optional() }),
  loaderDeps: ({ search }) => ({ account: search.account }),
  loader: async ({ deps }) => {
    const accounts = await getAccounts();
    const account = accounts.find((item) => item.slug === deps.account) ?? accounts[0];
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
  const selectedSlug = Route.useSearch().account ?? accounts[0]?.slug;
  const stages = [
    [Archive, "Sources", "Gmail · Slack · CRM · Meet · uploads"],
    [FileArrowUp, "Ingest", "Parse · dates · people · dedupe"],
    [Brain, "Memory", "One bank per account"],
    [MagicWand, "Agent", "Commitments · landmines · brief · ask"],
    [MonitorPlay, "Surfaces", "Web app · MCP"],
  ] as const;
  return (
    <>
      <p className="page-eyebrow">Workspace</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Pipeline</h1>
      <p className="mt-2 max-w-2xl text-slate-700 dark:text-slate-200">
        A clear path from account history to the next conversation.
      </p>
      {accounts.length > 1 ? (
        <label className="mt-5 block max-w-xs text-sm font-medium">
          Account
          <select
            value={selectedSlug}
            onChange={(event) => window.location.assign(`/pipeline?account=${event.target.value}`)}
            className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-[#171d2c]"
          >
            {accounts.map((account) => (
              <option key={account.slug} value={account.slug}>
                {account.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <section className="surface mt-8 overflow-x-auto rounded-2xl border p-5 shadow-sm">
        <div className="flex min-w-[720px] items-center justify-between gap-2">
          {stages.map(([Icon, label, description], index) => (
            <div key={label} className="contents">
              <div className="w-32 rounded-2xl border border-sky-100 bg-sky-50 p-4 text-center dark:border-sky-500/20 dark:bg-sky-500/10">
                <Icon
                  size={24}
                  weight="duotone"
                  className="mx-auto text-sky-700 dark:text-sky-200"
                  aria-hidden="true"
                />
                <span className="mt-2 block text-xs font-bold text-sky-800 dark:text-sky-200">
                  {label}
                </span>
                <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-300">{description}</p>
              </div>
              {index < stages.length - 1 ? (
                <span
                  aria-hidden="true"
                  className="flow-connector relative h-0.5 flex-1 bg-sky-200 dark:bg-sky-800"
                />
              ) : null}
            </div>
          ))}
        </div>
      </section>
      {stats?.interactions ? (
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Stat value={stats.interactions} label="Interactions stored" />
          <Stat value={formatDate(stats.latestInteraction ?? null)} label="Latest interaction" />
          <Stat
            value={Object.entries(stats.sources)
              .filter(([, count]) => count)
              .map(([type, count]) => `${count} ${type}`)
              .join(" · ")}
            label="Imported sources"
          />
        </div>
      ) : accounts.length ? (
        <p className="mt-5 rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
          Import files to see this account&apos;s pipeline.{" "}
          <Link
            to="/accounts/$slug/import"
            params={{ slug: selectedSlug ?? accounts[0].slug }}
            className="font-semibold text-sky-700 underline dark:text-sky-300"
          >
            Import files
          </Link>
        </p>
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
          <article key={title} className="surface rounded-2xl border p-5">
            <h2 className="font-semibold">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{text}</p>
          </article>
        ))}
      </div>
      {accounts.length ? (
        <p className="mt-6 text-sm text-slate-500">
          Showing workspace context for{" "}
          {accounts.find((account) => account.slug === selectedSlug)?.name ?? accounts[0]?.name}.
        </p>
      ) : null}
    </>
  );
}
function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="rounded-2xl bg-slate-900 p-5 text-slate-50">
      <p className="text-3xl font-semibold">{value}</p>
      <p className="mt-1 text-sm text-indigo-100">{label}</p>
    </div>
  );
}
