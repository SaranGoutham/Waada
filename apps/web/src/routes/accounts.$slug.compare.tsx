import { createFileRoute } from "@tanstack/react-router";
import { AccountNav, SampleBanner } from "../components/account-nav";
import { routeErrorMessage } from "../lib/error";
import { getAppMode, getCompare } from "../lib/server";
export const Route = createFileRoute("/accounts/$slug/compare")({
  loader: async ({ params }) => ({
    result: await getCompare({ data: { account: params.slug } }),
    mode: await getAppMode(),
  }),
  component: Compare,
  errorComponent: ({ error }) => <RouteError error={error} />,
});

function RouteError({ error }: { error: unknown }) {
  return (
    <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-950">
      {routeErrorMessage(error)}
    </p>
  );
}

function Compare() {
  const { result, mode } = Route.useLoaderData();
  const { slug } = Route.useParams();
  return (
    <>
      <AccountNav account={slug} />
      <SampleBanner active={mode.fakeCore} />
      <p className="text-xs font-bold tracking-[.16em] text-indigo-600">ACCOUNT CONTEXT</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Compare account views</h1>
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {[
          ["CRM only", "The CRM record, without conversation history.", result.crm],
          ["Summary only", "A compressed view of imported account history.", result.summary],
          ["Waada", "Commitments, landmines, and recall from account memory.", result.waada],
        ].map(([title, description, content]) => (
          <article
            key={title}
            className="min-h-60 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#171d2c]"
          >
            <h2 className="font-semibold">{title}</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{description}</p>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-300">
              {content}
            </p>
          </article>
        ))}
      </div>
    </>
  );
}
