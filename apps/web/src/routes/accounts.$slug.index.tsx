import { createFileRoute, redirect } from "@tanstack/react-router";
import { AccountHeader, AccountNav, SampleBanner, SourceChip } from "../components/account-nav";
import { routeErrorMessage } from "../lib/error";
import { briefSections, formatDate } from "../lib/format";
import { getAccounts, getAppMode, getBrief, getPipelineStats } from "../lib/server";

export const Route = createFileRoute("/accounts/$slug/")({
  loader: async ({ params }) => {
    const stats = await getPipelineStats({ data: { account: params.slug } });
    if (!stats.interactions) {
      throw redirect({ to: "/accounts/$slug/import", params: { slug: params.slug } });
    }
    return {
      brief: await getBrief({ data: { account: params.slug } }),
      mode: await getAppMode(),
      accounts: await getAccounts(),
      stats,
    };
  },
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
  const { brief, mode, accounts, stats } = Route.useLoaderData();
  const { slug } = Route.useParams();
  const accountName = accounts.find((account) => account.slug === slug)?.name ?? slug;
  const sections = briefSections(brief.markdown);
  return (
    <>
      <SampleBanner active={mode.fakeCore} />
      <AccountHeader
        account={accountName}
        interactions={stats.interactions}
        latestInteraction={stats.latestInteraction}
        action={
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="action-primary rounded-md px-3 py-2 text-sm font-semibold"
          >
            Refresh brief
          </button>
        }
      />
      <AccountNav account={slug} />
      <section className="mt-7">
        <h2 className="text-xl font-semibold">Open promises</h2>
        <div className="mt-3 grid gap-3">
          {brief.commitments
            .filter((item) => item.status === "open")
            .map((item) => {
              const overdue = Boolean(
                item.dueDate && new Date(item.dueDate).getTime() < Date.now(),
              );
              return (
                <article
                  key={item.source}
                  className="surface rounded-lg border border-[#eaeaea] p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <h3 className="max-w-3xl font-semibold">{item.text}</h3>
                    {overdue ? (
                      <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-bold text-rose-800">
                        Overdue
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-3 text-sm text-[#5f5f5b]">
                    {item.madeBy} <span aria-hidden="true">→</span> {item.madeTo} · Made{" "}
                    {formatDate(item.date)}
                    {item.dueDate ? ` · Due ${formatDate(item.dueDate)}` : ""}
                  </p>
                  <p className="mt-3 text-sm text-[#5f5f5b]">{item.evidence}</p>
                  <span className="mt-4 inline-block">
                    <SourceChip source={item.source} />
                  </span>
                </article>
              );
            })}
        </div>
      </section>
      <section className="mt-8">
        <h2 className="text-xl font-semibold">Don&apos;t reopen</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {brief.landmines.map((item) => (
            <article key={item.topic} className="border border-[#eaeaea] bg-[#fbf3db] p-5">
              <h3 className="font-semibold">{item.topic}</h3>
              <p className="mt-3 text-sm font-semibold text-[#956400]">
                Don’t re-open: {item.guidance}
              </p>
              <p className="mt-3 text-sm text-[#5f5f5b]">{item.whatHappened}</p>
              <div className="mt-3">
                <SourceChip source={item.source} />
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className="mt-8 grid gap-4 md:grid-cols-2">
        {(["recent changes", "people", "deal story", "customer words"] as const).map((title) =>
          sections[title] ? <BriefDetail key={title} title={title} text={sections[title]} /> : null,
        )}
      </section>
    </>
  );
}

function BriefDetail({ title, text }: { title: string; text: string }) {
  return (
    <article className="surface rounded-lg border p-5">
      <h2 className="font-semibold capitalize">
        {title === "recent changes"
          ? "What changed"
          : title === "customer words"
            ? "In their words"
            : title}
      </h2>
      <p className="mt-2 whitespace-pre-line text-sm leading-6 text-[#5f5f5b]">
        {text.replace(/\*\*/g, "")}
      </p>
    </article>
  );
}
