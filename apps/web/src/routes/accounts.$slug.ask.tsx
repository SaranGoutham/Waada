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
      <h1 className="text-3xl font-semibold">Ask about {slug}</h1>
      <form onSubmit={submit} className="mt-6 max-w-3xl">
        <label htmlFor="question" className="font-medium">
          Question
        </label>
        <textarea
          id="question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          className="mt-2 min-h-28 w-full rounded-xl border border-slate-300 bg-white p-3"
          required
        />
        <div className="mt-3 flex flex-wrap gap-2">
          {["What did we promise?", "What changed since July?"].map((suggestion) => (
            <button
              type="button"
              key={suggestion}
              onClick={() => setQuestion(suggestion)}
              className="rounded-full border border-slate-300 px-3 py-1 text-sm"
            >
              {suggestion}
            </button>
          ))}
        </div>
        <button
          type="submit"
          disabled={busy}
          className="mt-4 rounded-md bg-slate-900 px-4 py-2 font-semibold text-white disabled:opacity-60"
        >
          {busy ? "Searching…" : "Ask Waada"}
        </button>
        {error ? (
          <p role="alert" className="mt-3 text-rose-700">
            {error}
          </p>
        ) : null}
      </form>
      {answer ? (
        <article className="mt-8 max-w-3xl rounded-xl border border-slate-200 bg-white p-6">
          <p>{answer.text}</p>
          <h2 className="mt-5 text-sm font-semibold">Sources</h2>
          <ul className="mt-2 list-disc pl-5 text-sm text-slate-600">
            {answer.citations.map((citation) => (
              <li key={citation}>{citation}</li>
            ))}
          </ul>
        </article>
      ) : null}
    </>
  );
}
