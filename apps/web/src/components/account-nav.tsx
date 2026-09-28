import { Chats, EnvelopeSimple, FileText, type Icon, Phone } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { sourceDisplay } from "../lib/format";

export function AccountNav({ account }: { account: string }) {
  return (
    <nav
      aria-label="Account"
      className="mb-8 flex flex-wrap gap-1 border-b border-slate-200 text-sm font-medium dark:border-slate-800"
    >
      <Link
        to="/accounts/$slug"
        params={{ slug: account }}
        className="border-b-2 border-transparent px-3 py-3 text-slate-700 transition hover:border-sky-600 hover:text-sky-800 dark:text-slate-200 dark:hover:text-sky-200"
      >
        Brief
      </Link>
      <Link
        to="/accounts/$slug/commitments"
        params={{ slug: account }}
        className="border-b-2 border-transparent px-3 py-3 text-slate-700 transition hover:border-sky-600 hover:text-sky-800 dark:text-slate-200 dark:hover:text-sky-200"
      >
        Commitments
      </Link>
      <Link
        to="/accounts/$slug/import"
        params={{ slug: account }}
        className="border-b-2 border-transparent px-3 py-3 text-slate-700 transition hover:border-sky-600 hover:text-sky-800 dark:text-slate-200 dark:hover:text-sky-200"
      >
        Import
      </Link>
      <Link
        to="/accounts/$slug/ask"
        params={{ slug: account }}
        className="border-b-2 border-transparent px-3 py-3 text-slate-700 transition hover:border-sky-600 hover:text-sky-800 dark:text-slate-200 dark:hover:text-sky-200"
      >
        Ask
      </Link>
      <Link
        to="/accounts/$slug/compare"
        params={{ slug: account }}
        className="border-b-2 border-transparent px-3 py-3 text-slate-700 transition hover:border-sky-600 hover:text-sky-800 dark:text-slate-200 dark:hover:text-sky-200"
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

const sourceIcons: Record<ReturnType<typeof sourceDisplay>["type"], Icon> = {
  email: EnvelopeSimple,
  slack: Chats,
  call: Phone,
  note: FileText,
};

export function SourceChip({ source }: { source: string }) {
  const detail = sourceDisplay(source);
  const Icon = sourceIcons[detail.type];
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
      <Icon size={14} weight="bold" aria-hidden="true" />
      {detail.date ? <span>{detail.date}</span> : null}
      <span className="truncate">{detail.title}</span>
    </span>
  );
}
