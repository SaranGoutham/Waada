import { Chats, EnvelopeSimple, FileText, type Icon, Phone } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { sourceDisplay } from "../lib/format";

export function AccountNav({ account }: { account: string }) {
  const links = [
    ["Brief", "/accounts/$slug"],
    ["Promises", "/accounts/$slug/commitments"],
    ["Ask", "/accounts/$slug/ask"],
    ["Sources", "/accounts/$slug/import"],
    ["Compare", "/accounts/$slug/compare"],
  ] as const;
  return (
    <nav
      aria-label="Account"
      className="mb-10 flex flex-wrap gap-x-5 border-b border-[#eaeaea] text-sm font-medium"
    >
      {links.map(([label, to]) => (
        <Link
          key={label}
          to={to}
          params={{ slug: account }}
          className="border-b-2 border-transparent py-3 text-[#5f5f5b] transition hover:border-[#171716] hover:text-[#171716]"
          activeOptions={{ exact: true }}
          activeProps={{ className: "border-[#171716] font-semibold text-[#171716]" }}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}

export function AccountHeader({
  account,
  interactions,
  latestInteraction,
  action,
}: {
  account: string;
  interactions: number;
  latestInteraction?: string;
  action?: React.ReactNode;
}) {
  const summary = interactions
    ? `${interactions} ${interactions === 1 ? "item" : "items"} · last import ${
        sourceDisplay(latestInteraction ?? "").date ?? "—"
      }`
    : "No files yet";
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">{account}</h1>
        <p className="mt-2 text-sm text-[#5f5f5b]">{summary}</p>
      </div>
      {action}
    </header>
  );
}
export function SampleBanner({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <p role="status" className="mb-5 border border-[#eaeaea] bg-[#f7f6f3] px-4 py-3 text-sm">
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
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-[#f7f6f3] px-2.5 py-1 text-xs font-medium text-[#5f5f5b]">
      <Icon size={14} weight="bold" aria-hidden="true" />
      {detail.date ? <span>{detail.date}</span> : null}
      <span className="truncate">{detail.title}</span>
    </span>
  );
}
