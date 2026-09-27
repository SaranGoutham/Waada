import { Link } from "@tanstack/react-router";

export function AccountNav({ account }: { account: string }) {
  return (
    <nav
      aria-label="Account"
      className="mb-6 flex flex-wrap gap-3 text-sm font-medium text-slate-600"
    >
      <Link to="/accounts/$slug" params={{ slug: account }}>
        Brief
      </Link>
      <Link to="/accounts/$slug/commitments" params={{ slug: account }}>
        Commitments
      </Link>
      <Link to="/accounts/$slug/import" params={{ slug: account }}>
        Import
      </Link>
      <Link to="/accounts/$slug/ask" params={{ slug: account }}>
        Ask
      </Link>
      <Link to="/accounts/$slug/compare" params={{ slug: account }}>
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
