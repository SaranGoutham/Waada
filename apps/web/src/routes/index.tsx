import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { createAccount, getAccounts } from "../lib/server";

export const Route = createFileRoute("/")({ loader: () => getAccounts(), component: Home });

function Home() {
  const accounts = Route.useLoaderData();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const account = await createAccount({ data: { name } });
      window.location.assign(`/accounts/${account.slug}`);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Something went wrong. Check the server log.",
      );
      setBusy(false);
    }
  }
  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_20rem]">
      <section>
        <p className="page-eyebrow">Deal continuity</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">
          Pick up the account without dropping the thread.
        </h1>
        <p className="mt-3 max-w-2xl text-slate-700 dark:text-slate-200">
          Open an account to surface commitments, settled objections, and the context a new owner
          needs.
        </p>
        <div className="mt-8 space-y-3">
          {accounts.length ? (
            accounts.map((account) => (
              <Link
                key={account.slug}
                to="/accounts/$slug"
                params={{ slug: account.slug }}
                className="surface block rounded-xl border p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-600 hover:shadow-md"
              >
                <p className="font-semibold text-slate-950 dark:text-slate-50">{account.name}</p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">/{account.slug}</p>
              </Link>
            ))
          ) : (
            <p className="rounded-xl border border-dashed border-slate-300 p-6 text-slate-700 dark:border-slate-600 dark:text-slate-200">
              No accounts yet. Create one to begin.
            </p>
          )}
        </div>
      </section>
      <aside className="h-fit rounded-xl bg-slate-900 p-6 text-slate-50 shadow-lg shadow-slate-900/15">
        <h2 className="text-lg font-semibold">New account</h2>
        <form onSubmit={submit} className="mt-4 space-y-3">
          <label className="block text-sm" htmlFor="account-name">
            Account name
          </label>
          <input
            id="account-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-2"
            required
          />
          <button
            type="submit"
            disabled={busy}
            className="action-primary w-full rounded-md px-3 py-2 font-semibold disabled:opacity-60"
          >
            {busy ? "Creating…" : "Create account"}
          </button>
          {error ? (
            <p role="alert" className="text-sm text-rose-200">
              {error}
            </p>
          ) : null}
        </form>
      </aside>
    </div>
  );
}
