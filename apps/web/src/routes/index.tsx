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
        <p className="text-sm font-semibold text-teal-700">DEAL CONTINUITY</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">
          Pick up the account without dropping the thread.
        </h1>
        <p className="mt-3 max-w-2xl text-slate-600">
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
                className="block rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:border-teal-400"
              >
                <p className="font-semibold">{account.name}</p>
                <p className="mt-1 text-sm text-slate-500">/{account.slug}</p>
              </Link>
            ))
          ) : (
            <p className="rounded-xl border border-dashed border-slate-300 p-6 text-slate-600">
              No accounts yet. Create one to begin.
            </p>
          )}
        </div>
      </section>
      <aside className="h-fit rounded-xl bg-slate-900 p-6 text-white">
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
            className="w-full rounded-md bg-teal-300 px-3 py-2 font-semibold text-slate-950 disabled:opacity-60"
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
