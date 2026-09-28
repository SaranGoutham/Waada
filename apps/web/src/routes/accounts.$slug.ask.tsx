import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AccountNav, SampleBanner } from "../components/account-nav";
import { getAnswer, getAppMode } from "../lib/server";
export const Route = createFileRoute("/accounts/$slug/ask")({
  loader: () => getAppMode(),
  component: Ask,
});
function Ask() {
  const mode = Route.useLoaderData();
  const { slug } = Route.useParams();
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
      <p className="page-eyebrow">Account context</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Ask about {slug}</h1>
      <form onSubmit={submit} className="surface mt-6 max-w-3xl rounded-2xl border p-5 shadow-sm">
        <label htmlFor="question" className="font-medium">
          Question
        </label>
        <textarea
          id="question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          className="mt-2 min-h-28 w-full rounded-xl border border-slate-300 bg-white p-3 dark:border-slate-700 dark:bg-slate-900"
          required
        />
        <div className="mt-3 flex flex-wrap gap-2">
          {["What did we promise?", "What changed since July?"].map((suggestion) => (
            <button
              type="button"
              key={suggestion}
              onClick={() => setQuestion(suggestion)}
              className="rounded-full border border-slate-300 px-3 py-1 text-sm hover:border-indigo-400 hover:text-indigo-700 dark:border-slate-700"
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
        <article className="surface mt-8 max-w-3xl rounded-2xl border p-6 shadow-sm">
          <p className="leading-7">{answer.text}</p>
          <h2 className="mt-5 text-sm font-semibold">Sources</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {[...new Set(answer.citations)].map((citation) => (
              <span
                key={citation}
                className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300"
              >
                {citation}
              </span>
            ))}
          </div>
        </article>
      ) : null}
    </>
  );
}
