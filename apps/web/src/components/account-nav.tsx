import { Link } from "@tanstack/react-router";

export function AccountNav({ account }: { account: string }) {
  return (
    <nav
      aria-label="Account"
      className="mb-8 flex flex-wrap gap-1 border-b border-slate-200 text-sm font-medium dark:border-slate-800"
    >
      <Link
        to="/accounts/$slug"
        params={{ slug: account }}
        className="border-b-2 border-transparent px-3 py-3 text-slate-600 hover:border-indigo-500 hover:text-indigo-700 dark:text-slate-300"
      >
        Brief
      </Link>
      <Link
        to="/accounts/$slug/commitments"
        params={{ slug: account }}
        className="border-b-2 border-transparent px-3 py-3 text-slate-600 hover:border-indigo-500 hover:text-indigo-700 dark:text-slate-300"
      >
        Commitments
      </Link>
      <Link
        to="/accounts/$slug/import"
        params={{ slug: account }}
        className="border-b-2 border-transparent px-3 py-3 text-slate-600 hover:border-indigo-500 hover:text-indigo-700 dark:text-slate-300"
      >
        Import
      </Link>
      <Link
        to="/accounts/$slug/ask"
        params={{ slug: account }}
        className="border-b-2 border-transparent px-3 py-3 text-slate-600 hover:border-indigo-500 hover:text-indigo-700 dark:text-slate-300"
      >
        Ask
      </Link>
      <Link
        to="/accounts/$slug/compare"
        params={{ slug: account }}
        className="border-b-2 border-transparent px-3 py-3 text-slate-600 hover:border-indigo-500 hover:text-indigo-700 dark:text-slate-300"
      >
        Compare
      </Link>
    </nav>
  );
}

export function SampleBanner({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <p
      role="status"
      className="mb-5 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-950"
    >
      Sample data is active. Brief, Ask, and Compare use deterministic examples until the agent core
      is available.
    </p>
  );
}
