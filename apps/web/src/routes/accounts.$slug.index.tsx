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
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="page-eyebrow">Account brief</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Before you call {slug}</h1>
        </div>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="action-secondary inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold shadow-sm"
        >
          <span aria-hidden="true">↻</span> Refresh
        </button>
      </div>
      <section className="mt-7">
        <h2 className="text-xl font-semibold">Open commitments</h2>
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
                  className="surface rounded-2xl border border-rose-200 p-5 shadow-sm dark:border-rose-900/60"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <h3 className="max-w-3xl font-semibold">{item.text}</h3>
                    {overdue ? (
                      <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-bold text-rose-800">
                        Overdue
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                    {item.madeBy} <span aria-hidden="true">→</span> {item.madeTo} · Made{" "}
                    {formatDate(item.date)} · Due {formatDate(item.dueDate ?? null)}
                  </p>
                  <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{item.evidence}</p>
                  <span className="mt-4 inline-block rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {item.source}
                  </span>
                </article>
              );
            })}
        </div>
      </section>
      <section className="mt-8">
        <h2 className="text-xl font-semibold">Landmines</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {brief.landmines.map((item) => (
            <article
              key={item.topic}
              className="rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/60 dark:bg-amber-950/20"
            >
              <h3 className="font-semibold">{item.topic}</h3>
              <p className="mt-3 text-sm font-semibold text-amber-950 dark:text-amber-100">
                Don’t re-open: {item.guidance}
              </p>
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{item.whatHappened}</p>
              <p className="mt-3 text-xs text-slate-600 dark:text-slate-400">{item.source}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="mt-8 grid gap-4 md:grid-cols-2">
        <BriefDetail
          title="People"
          text="The people named across this account’s imported history."
        />
        <BriefDetail title="Deal story" text={brief.markdown} />
        <BriefDetail
          title="Recent changes"
          text="Review the open commitments above before your next conversation."
        />
        <BriefDetail
          title="Customer words"
          text="Quoted context appears here when it is present in the account history."
        />
      </section>
    </>
  );
}

function BriefDetail({ title, text }: { title: string; text: string }) {
  return (
    <article className="surface rounded-2xl border p-5">
      <h2 className="font-semibold">{title}</h2>
      <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600 dark:text-slate-300">
        {text.replace(/\*\*/g, "")}
      </p>
    </article>
  );
}
