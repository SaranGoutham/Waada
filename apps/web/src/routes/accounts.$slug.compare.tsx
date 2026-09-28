import { createFileRoute } from "@tanstack/react-router";
import { AccountHeader, AccountNav, SampleBanner } from "../components/account-nav";
import { routeErrorMessage } from "../lib/error";
import { getAccounts, getAppMode, getCompare, getPipelineStats } from "../lib/server";
export const Route = createFileRoute("/accounts/$slug/compare")({
  loader: async ({ params }) => ({
    result: await getCompare({ data: { account: params.slug } }),
    mode: await getAppMode(),
    accounts: await getAccounts(),
    stats: await getPipelineStats({ data: { account: params.slug } }),
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
  const { result, mode, accounts, stats } = Route.useLoaderData();
  const { slug } = Route.useParams();
  const accountName = accounts.find((account) => account.slug === slug)?.name ?? slug;
  return (
    <>
      <SampleBanner active={mode.fakeCore} />
      <AccountHeader
        account={accountName}
        interactions={stats.interactions}
        latestInteraction={stats.latestInteraction}
      />
      <AccountNav account={slug} />
      <h2 className="text-xl font-semibold">Compare</h2>
      <p className="mt-2 text-sm text-[#5f5f5b]">
        Compare the CRM record, a plain summary, and Waada&apos;s memory-based brief side by side.
      </p>
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {[
          ["CRM only", "The CRM record, without conversation history.", result.crm],
          ["Summary only", "A compressed view of imported account history.", result.summary],
          ["Waada", "Promises, resolved objections, and recall from account memory.", result.waada],
        ].map(([title, description, content]) => (
          <article key={title} className="surface min-h-60 rounded-lg border p-5">
            <h2 className="font-semibold">{title}</h2>
            <p className="mt-1 text-xs text-[#5f5f5b]">{description}</p>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-[#5f5f5b]">{content}</p>
          </article>
        ))}
      </div>
    </>
  );
}
