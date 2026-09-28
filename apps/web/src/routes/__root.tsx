import { ChartLineUp, Gear, Plugs, Plus } from "@phosphor-icons/react";
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
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Waada — deal continuity" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  const accounts = Route.useLoaderData();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const activeSlug = pathname.match(/^\/accounts\/([^/]+)/)?.[1];
  const activeAccount = accounts.find((account) => account.slug === activeSlug);
  const isLanding = pathname === "/";
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {isLanding ? (
          children
        ) : (
          <div className="app-frame min-h-screen lg:grid lg:grid-cols-[15rem_1fr]">
            <aside className="app-sidebar border-b px-5 py-6 lg:border-r lg:border-b-0">
              <Link
                to="/app"
                className="flex items-center gap-2 text-lg font-semibold tracking-tight"
              >
                <span className="brand-mark grid size-7 place-items-center text-xs font-bold">
                  W
                </span>
                Waada
              </Link>
              <p className="nav-label mt-10">Accounts</p>
              <nav className="mt-2 space-y-1" aria-label="Accounts">
                {accounts.map((account) => (
                  <Link
                    key={account.slug}
                    to="/accounts/$slug"
                    params={{ slug: account.slug }}
                    className="nav-link"
                  >
                    {account.name}
                  </Link>
                ))}
                <Link to="/app" className="nav-link inline-flex items-center gap-2">
                  <Plus size={15} aria-hidden="true" /> New account
                </Link>
              </nav>
              <p className="nav-label mt-8">Workspace</p>
              <nav className="mt-2 space-y-1" aria-label="Workspace">
                <Link to="/integrations" className="nav-link inline-flex items-center gap-2">
                  <Plugs size={15} aria-hidden="true" /> Integrations
                </Link>
                <Link to="/pipeline" className="nav-link inline-flex items-center gap-2">
                  <ChartLineUp size={15} aria-hidden="true" /> Pipeline
                </Link>
                <Link to="/settings/llm" className="nav-link inline-flex items-center gap-2">
                  <Gear size={15} aria-hidden="true" /> Settings
                </Link>
              </nav>
            </aside>
            <div className="min-w-0">
              <header className="app-header flex min-h-16 items-center border-b px-6 sm:px-8">
                <p className="font-medium">{activeAccount?.name ?? "Workspace"}</p>
              </header>
              <main className="mx-auto max-w-6xl px-6 py-10 sm:px-10">{children}</main>
            </div>
          </div>
        )}
        <Scripts />
      </body>
    </html>
  );
}
