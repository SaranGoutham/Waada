import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AccountHeader, AccountNav, SampleBanner } from "../components/account-nav";
import { commitmentRow } from "../lib/format";
import { getAccounts, getAppMode, getBrief, getPipelineStats } from "../lib/server";
export const Route = createFileRoute("/accounts/$slug/commitments")({
  loader: async ({ params }) => ({
    brief: await getBrief({ data: { account: params.slug } }),
    mode: await getAppMode(),
    accounts: await getAccounts(),
    stats: await getPipelineStats({ data: { account: params.slug } }),
  }),
  component: Commitments,
});
function Commitments() {
  const { brief, mode, accounts, stats } = Route.useLoaderData();
  const { slug } = Route.useParams();
  const accountName = accounts.find((account) => account.slug === slug)?.name ?? slug;
  const [filter, setFilter] = useState("all");
  const [dueOnly, setDueOnly] = useState(false);
  const items = brief.commitments.filter(
    (item) => (filter === "all" || item.status === filter) && (!dueOnly || item.dueDate),
  );
  return (
    <>
      <AccountNav account={slug} />
      <SampleBanner active={mode.fakeCore} />
      <AccountHeader
        account={accountName}
        interactions={stats.interactions}
        latestInteraction={stats.latestInteraction}
      />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 className="text-xl font-semibold">Promises</h2>
        <div className="flex gap-2">
          <label className="sr-only" htmlFor="status-filter">
            Status
          </label>
          <select
            id="status-filter"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-[#171d2c]"
          >
            <option value="all">All statuses</option>
            <option value="open">Open</option>
            <option value="unclear">Unclear</option>
            <option value="delivered">Delivered</option>
          </select>
          <button
            type="button"
            aria-pressed={dueOnly}
            onClick={() => setDueOnly((value) => !value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold dark:border-slate-700"
          >
            Has due date
          </button>
        </div>
      </div>
      <div className="surface mt-6 overflow-x-auto rounded-lg border">
        <table className="w-full text-left text-sm">
          <thead className="surface-muted">
            <tr>
              <th className="p-3">Status</th>
              <th className="p-3">Promise</th>
              <th className="p-3">Made by → to</th>
              <th className="p-3">Date</th>
              <th className="p-3">Due date</th>
              <th className="p-3">Evidence</th>
              <th className="p-3">Source</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const row = commitmentRow(item);
              return (
                <tr key={`${row.source}-${row.promise}`} className="border-t">
                  <td className="p-3">
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      {row.status}
                    </span>
                  </td>
                  <td className="p-3 font-medium">{row.promise}</td>
                  <td className="p-3">{row.people}</td>
                  <td className="p-3">{row.date}</td>
                  <td className="p-3">
                    {row.dueDate}
                    {row.overdue ? (
                      <span className="ml-2 rounded-full bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-800">
                        Overdue
                      </span>
                    ) : null}
                  </td>
                  <td className="p-3">{row.evidence}</td>
                  <td className="p-3">{row.source}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
