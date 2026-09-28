import { ArrowRight } from "@phosphor-icons/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { formatDate } from "../lib/format";
import { createAccount, getAccounts, getPipelineStats } from "../lib/server";

export const Route = createFileRoute("/app")({
  loader: async () => {
    const accounts = await getAccounts();
    return {
      accounts,
      stats: await Promise.all(
        accounts.map(
          async (account) =>
            [account.slug, await getPipelineStats({ data: { account: account.slug } })] as const,
        ),
      ),
    };
  },
  component: Dashboard,
});
function Dashboard() {
  const { accounts, stats } = Route.useLoaderData();
  const statsByAccount = Object.fromEntries(stats);
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
    <div className="grid gap-14 lg:grid-cols-[1fr_18rem]">
      <section>
        <p className="page-eyebrow">Accounts</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Your account handoffs</h1>
        <p className="mt-3 max-w-xl text-[#5f5f5b]">
          Open an account to review the promises, decisions, and history that need continuity.
        </p>
        <div className="mt-10 divide-y divide-[#eaeaea] border-y border-[#eaeaea]">
          {accounts.length ? (
            accounts.map((account) => (
              <Link
                key={account.slug}
                to="/accounts/$slug"
                params={{ slug: account.slug }}
                className="account-row flex items-center justify-between gap-4 py-5"
              >
                <div>
                  <p className="font-semibold">{account.name}</p>
                  <p className="mt-1 text-sm text-[#777774]">
                    {statsByAccount[account.slug]?.interactions ?? 0} interactions imported · Last
                    import {formatDate(statsByAccount[account.slug]?.latestInteraction ?? null)}
                  </p>
                </div>
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
            ))
          ) : (
            <p className="py-8 text-sm text-[#777774]">No accounts yet. Create one to begin.</p>
          )}
        </div>
      </section>
      <aside className="h-fit border border-[#eaeaea] bg-white p-6">
        <h2 className="font-semibold">New account</h2>
        <form onSubmit={submit} className="mt-5 space-y-3">
          <label className="block text-sm" htmlFor="account-name">
            Account name
          </label>
          <input
            id="account-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full rounded-md border border-[#d8d8d5] px-3 py-2"
            required
          />
          <button
            type="submit"
            disabled={busy}
            className="action-primary w-full rounded-md px-3 py-2 text-sm font-semibold disabled:opacity-60"
          >
            {busy ? "Creating…" : "Create account"}
          </button>
          {error ? (
            <p role="alert" className="text-sm text-[#9f2f2d]">
              {error}
            </p>
          ) : null}
        </form>
      </aside>
    </div>
  );
}
