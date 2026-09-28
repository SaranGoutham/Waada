import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AccountHeader, AccountNav, SampleBanner, SourceChip } from "../components/account-nav";
import { getAccounts, getAnswer, getAppMode, getPipelineStats } from "../lib/server";
export const Route = createFileRoute("/accounts/$slug/ask")({
  loader: async ({ params }) => ({
    mode: await getAppMode(),
    accounts: await getAccounts(),
    stats: await getPipelineStats({ data: { account: params.slug } }),
  }),
  component: Ask,
});
function Ask() {
  const { mode, accounts, stats } = Route.useLoaderData();
  const { slug } = Route.useParams();
  const accountName = accounts.find((account) => account.slug === slug)?.name ?? slug;
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<{ text: string; citations: string[] }>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      setAnswer(await getAnswer({ data: { account: slug, question } }));
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Something went wrong. Check the server log.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <AccountNav account={slug} />
      <SampleBanner active={mode.fakeCore} />
      <AccountHeader
        account={accountName}
        interactions={stats.interactions}
        latestInteraction={stats.latestInteraction}
      />
      <h2 className="text-xl font-semibold">Ask</h2>
      <form onSubmit={submit} className="surface mt-6 max-w-3xl rounded-lg border p-5">
        <label htmlFor="question" className="font-medium">
          Question
        </label>
        <textarea
          id="question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          className="mt-2 min-h-28 w-full rounded-md border border-[#d8d8d5] bg-white p-3"
          required
        />
        <div className="mt-3 flex flex-wrap gap-2">
          {["What did we promise?", "What changed since July?"].map((suggestion) => (
            <button
              type="button"
              key={suggestion}
              onClick={() => setQuestion(suggestion)}
              className="rounded-full border border-[#d8d8d5] px-3 py-1 text-sm hover:border-[#171716]"
            >
              {suggestion}
            </button>
          ))}
        </div>
        <button
          type="submit"
          disabled={busy}
          className="action-primary mt-4 rounded-lg px-4 py-2 font-semibold disabled:opacity-60"
        >
          {busy ? "Finding context…" : "Ask Waada"}
        </button>
        {error ? (
          <p role="alert" className="mt-3 text-rose-700">
            {error}
          </p>
        ) : null}
      </form>
      {answer ? (
        <article className="surface mt-8 max-w-3xl rounded-lg border p-6">
          <p className="leading-7">{answer.text}</p>
          <h2 className="mt-5 text-sm font-semibold">Sources</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {[...new Set(answer.citations)].map((citation) => (
              <SourceChip key={citation} source={citation} />
            ))}
          </div>
        </article>
      ) : null}
    </>
  );
}
