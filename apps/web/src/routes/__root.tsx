import {
  createRootRoute,
  HeadContent,
  Link,
  Scripts,
  useRouterState,
} from "@tanstack/react-router";
import { getAccounts } from "../lib/server";

import appCss from "../styles.css?url";

export const Route = createRootRoute({
  loader: () => getAccounts(),
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "Waada — deal continuity",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  const accounts = Route.useLoaderData();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const activeSlug = pathname.match(/^\/accounts\/([^/]+)/)?.[1];
  const activeAccount = accounts.find((account) => account.slug === activeSlug);
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <div className="min-h-screen lg:grid lg:grid-cols-[15.5rem_1fr]">
          <aside className="border-b border-slate-200 bg-white px-5 py-5 lg:border-r lg:border-b-0 dark:border-slate-800 dark:bg-[#151a29]">
            <Link to="/" className="flex items-center gap-3 text-lg font-bold tracking-tight">
              <span className="grid size-8 place-items-center rounded-lg bg-indigo-600 text-sm text-white">
                W
              </span>
              Waada
            </Link>
            <p className="mt-8 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
              Accounts
            </p>
            <nav className="mt-2 space-y-1" aria-label="Accounts">
              {accounts.map((account) => (
                <Link
                  key={account.slug}
                  to="/accounts/$slug"
                  params={{ slug: account.slug }}
                  className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  {account.name}
                </Link>
              ))}
              <Link
                to="/"
                className="block rounded-lg px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50 dark:text-indigo-300"
              >
                + New account
              </Link>
            </nav>
            <p className="mt-7 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
              Workspace
            </p>
            <nav className="mt-2 space-y-1" aria-label="Workspace">
              <Link
                to="/integrations"
                className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Integrations
              </Link>
              <Link
                to="/pipeline"
                className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Pipeline
              </Link>
              <Link
                to="/settings/llm"
                className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Settings
              </Link>
            </nav>
          </aside>
          <div className="min-w-0">
            <header className="flex min-h-16 items-center border-b border-slate-200 bg-white px-5 dark:border-slate-800 dark:bg-[#151a29]">
              <p className="font-semibold">{activeAccount?.name ?? "Workspace"}</p>
            </header>
            <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8">{children}</main>
          </div>
        </div>
        <Scripts />
      </body>
    </html>
  );
}
