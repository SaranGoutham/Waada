import { createFileRoute } from "@tanstack/react-router";
import { AccountNav, SampleBanner } from "../components/account-nav";
import { getAppMode, getCompare } from "../lib/server";
export const Route = createFileRoute("/accounts/$slug/compare")({
  loader: async ({ params }) => ({
    result: await getCompare({ data: { account: params.slug } }),
    mode: await getAppMode(),
  }),
  component: Compare,
});
function Compare() {
  const { result, mode } = Route.useLoaderData();
  const { slug } = Route.useParams();
  return (
    <>
      <AccountNav account={slug} />
      <SampleBanner active={mode.fakeCore} />
      <h1 className="text-3xl font-semibold">Compare account views</h1>
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {[
          ["CRM only", result.crm],
          ["Summary only", result.summary],
          ["Waada", result.waada],
        ].map(([title, content]) => (
          <article key={title} className="min-h-60 rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="font-semibold">{title}</h2>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-700">{content}</p>
          </article>
        ))}
      </div>
    </>
  );
}
