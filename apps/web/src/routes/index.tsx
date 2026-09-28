import { ArrowRight } from "@phosphor-icons/react";
import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({ component: Landing });
const features = [
  ["Promise ledger", "Open, overdue, and delivered promises with the evidence behind each one."],
  ["Don't reopen", "Settled objections the next owner should not reopen."],
  ["Brief", "A focused starting point before the next customer conversation."],
  ["Ask with sources", "Trace a change or decision back to the original account history."],
  ["Compare", "Read Waada alongside CRM-only and summary-only views."],
  ["Per-account memory", "Hindsight keeps each account's context separate and recallable."],
];
const stages = ["Sources", "Ingest", "Memory", "Agent", "Surfaces"];
const details = [
  "Emails, Slack, calls",
  "Parse and organize",
  "One bank per account",
  "Find promises and risks",
  "Briefs, answers, comparison",
];

function Landing() {
  return (
    <div className="landing">
      <header className="landing-nav mx-auto flex max-w-6xl items-center justify-between px-6 py-5 sm:px-10">
        <Link to="/" className="text-lg font-semibold tracking-tight">
          Waada
        </Link>
        <nav
          className="hidden items-center gap-6 text-sm text-[#5f5f5b] md:flex"
          aria-label="Landing navigation"
        >
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
          <a href="#integrations">Integrations</a>
        </nav>
        <Link to="/app" className="action-primary rounded-md px-3 py-2 text-sm font-semibold">
          Open dashboard
        </Link>
      </header>
      <main>
        <section className="landing-hero mx-auto max-w-6xl px-6 pb-28 pt-24 sm:px-10 sm:pt-32">
          <p className="page-eyebrow">Deal continuity</p>
          <h1 className="mt-5 max-w-4xl text-5xl font-semibold tracking-[-0.045em] sm:text-7xl">
            Never lose a deal when a rep leaves.
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-[#5f5f5b]">
            Waada remembers every promise, objection, and decision from the departed rep&apos;s
            emails, Slack, and calls, then briefs the new owner in a minute.
          </p>
          <Link
            to="/app"
            className="mt-9 inline-flex items-center gap-2 text-sm font-semibold underline underline-offset-4"
          >
            Open dashboard <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </section>
        <section id="features" className="landing-section mx-auto max-w-6xl px-6 py-24 sm:px-10">
          <p className="page-eyebrow">What stays with the account</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight">
            The context a new owner needs.
          </h2>
          <div className="mt-10 grid border-l border-t border-[#eaeaea] sm:grid-cols-2 lg:grid-cols-3">
            {features.map(([title, text]) => (
              <article key={title} className="feature-cell border-b border-r border-[#eaeaea] p-6">
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-[#5f5f5b]">{text}</p>
              </article>
            ))}
          </div>
        </section>
        <section id="how-it-works" className="landing-section landing-muted">
          <div className="mx-auto max-w-6xl px-6 py-24 sm:px-10">
            <p className="page-eyebrow">How it works</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight">
              From account history to a clear next step.
            </h2>
            <div className="mt-12 grid gap-4 md:grid-cols-5">
              {stages.map((stage, index) => (
                <div key={stage} className="flow-stage">
                  <span className="text-xs text-[#777774]">0{index + 1}</span>
                  <p className="mt-4 font-semibold">{stage}</p>
                  <p className="mt-2 text-sm leading-6 text-[#5f5f5b]">{details[index]}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section
          id="integrations"
          className="landing-section mx-auto max-w-6xl px-6 py-24 sm:px-10"
        >
          <div className="flex flex-col justify-between gap-8 sm:flex-row sm:items-end">
            <div>
              <p className="page-eyebrow">Integrations</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight">
                Built around the tools your team already uses.
              </h2>
            </div>
            <Link to="/integrations" className="text-sm font-semibold underline underline-offset-4">
              View integrations
            </Link>
          </div>
          <p className="mt-10 border-y border-[#eaeaea] py-6 text-sm font-medium tracking-wide text-[#5f5f5b]">
            Gmail <span aria-hidden="true">·</span> Slack <span aria-hidden="true">·</span> HubSpot{" "}
            <span aria-hidden="true">·</span> Google Meet <span aria-hidden="true">·</span> MCP
            (Claude / Cursor) <span aria-hidden="true">·</span> Hindsight{" "}
            <span aria-hidden="true">·</span> Groq
          </p>
        </section>
      </main>
      <footer className="border-t border-[#eaeaea]">
        <p className="mx-auto max-w-6xl px-6 py-7 text-sm text-[#777774] sm:px-10">
          Waada keeps the thread intact.
        </p>
      </footer>
    </div>
  );
}
