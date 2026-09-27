import { createFileRoute } from "@tanstack/react-router";
import { AccountNav, SampleBanner } from "../components/account-nav";
import { commitmentRow } from "../lib/format";
import { getAppMode, getBrief } from "../lib/server";
export const Route = createFileRoute("/accounts/$slug/commitments")({
  loader: async ({ params }) => ({
    brief: await getBrief({ data: { account: params.slug } }),
    mode: await getAppMode(),
  }),
  component: Commitments,
});
function Commitments() {
  const { brief, mode } = Route.useLoaderData();
  const { slug } = Route.useParams();
  return (
    <>
      <AccountNav account={slug} />
      <SampleBanner active={mode.fakeCore} />
      <h1 className="text-3xl font-semibold">Commitment ledger</h1>
      <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="p-3">Status</th>
              <th className="p-3">Promise</th>
              <th className="p-3">Made by → to</th>
              <th className="p-3">Date</th>
              <th className="p-3">Evidence</th>
              <th className="p-3">Source</th>
            </tr>
          </thead>
          <tbody>
            {brief.commitments.map((item) => {
              const row = commitmentRow(item);
              return (
                <tr key={`${row.source}-${row.promise}`} className="border-t">
                  <td className="p-3">
                    <span className="rounded-full bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-800">
                      {row.status}
                    </span>
                  </td>
                  <td className="p-3 font-medium">{row.promise}</td>
                  <td className="p-3">{row.people}</td>
                  <td className="p-3">{row.date}</td>
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
