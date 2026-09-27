import { createFileRoute } from "@tanstack/react-router";
import { AccountNav, SampleBanner } from "../components/account-nav";
import { routeErrorMessage } from "../lib/error";
import { formatDate } from "../lib/format";
import { getAppMode, getBrief } from "../lib/server";

export const Route = createFileRoute("/accounts/$slug/")({
  loader: async ({ params }) => ({
    brief: await getBrief({ data: { account: params.slug } }),
    mode: await getAppMode(),
  }),
  component: BriefPage,
  errorComponent: ({ error }) => <RouteError error={error} />,
});

function RouteError({ error }: { error: unknown }) {
  return (
    <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-950">
      {routeErrorMessage(error)}
    </p>
  );
}

function BriefPage() {
  const { brief, mode } = Route.useLoaderData();
  const { slug } = Route.useParams();
  return (
    <>
      <AccountNav account={slug} />
      <SampleBanner active={mode.fakeCore} />
      <div className="flex items-end justify-between">
        <div>
          <p className="text-sm font-semibold text-teal-700">ACCOUNT BRIEF</p>
          <h1 className="text-3xl font-semibold">{slug}</h1>
        </div>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium"
        >
          Refresh
        </button>
      </div>
      <section className="mt-7">
        <h2 className="text-xl font-semibold">🚩 Open commitments</h2>
        <div className="mt-3 overflow-x-auto rounded-xl border border-rose-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-rose-50 text-slate-600">
              <tr>
                <th className="p-3">Promise</th>
                <th className="p-3">Due / made</th>
                <th className="p-3">Evidence</th>
              </tr>
            </thead>
            <tbody>
              {brief.commitments
                .filter((item) => item.status === "open")
                .map((item) => (
                  <tr key={item.source} className="border-t border-slate-100">
                    <td className="p-3 font-medium">{item.text}</td>
                    <td className="p-3">{formatDate(item.date)}</td>
                    <td className="p-3 text-slate-600">{item.evidence}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="mt-8">
        <h2 className="text-xl font-semibold">⚠️ Landmines</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {brief.landmines.map((item) => (
            <article
              key={item.topic}
              className="rounded-xl border border-amber-200 bg-amber-50 p-4"
            >
              <h3 className="font-semibold">{item.topic}</h3>
              <p className="mt-2 text-sm">{item.guidance}</p>
              <p className="mt-2 text-xs text-slate-600">{item.source}</p>
            </article>
          ))}
        </div>
      </section>
      <article className="mt-8 whitespace-pre-wrap rounded-xl border border-slate-200 bg-white p-6 text-slate-700">
        {brief.markdown}
      </article>
    </>
  );
}
