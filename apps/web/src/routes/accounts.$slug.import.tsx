import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AccountNav } from "../components/account-nav";
import { importPreviewRow } from "../lib/format";
import { previewImport, runImport } from "../lib/server";

type Upload = { name: string; data: Uint8Array<ArrayBuffer> };
export const Route = createFileRoute("/accounts/$slug/import")({ component: ImportPage });
function ImportPage() {
  const { slug } = Route.useParams();
  const [files, setFiles] = useState<Upload[]>([]);
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof previewImport>>>();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function collect(input: FileList | null) {
    if (!input) return;
    setBusy(true);
    setError("");
    try {
      const uploaded = await Promise.all(
        [...input].map(async (file) => ({
          name: file.name,
          data: new Uint8Array(await file.arrayBuffer()),
        })),
      );
      setFiles(uploaded);
      setPreview(await previewImport({ data: { account: slug, files: uploaded } }));
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Something went wrong. Check the server log.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function submit() {
    setBusy(true);
    setError("");
    try {
      const outcome = await runImport({ data: { account: slug, files } });
      setPreview(outcome.parsed);
      setMessage(
        `${outcome.crmSaved ? "CRM record saved. " : ""}Imported ${outcome.report.added}; skipped ${outcome.report.skipped}.${outcome.report.errors.length ? ` ${outcome.report.errors.join(" ")}` : ""}`,
      );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Something went wrong. Check the server log.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <AccountNav account={slug} />
      <p className="text-xs font-bold tracking-[.16em] text-indigo-600">ACCOUNT HISTORY</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Import account history</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-300">
        Upload exported .eml, Slack JSON, transcript, or supported audio files. Files are reviewed
        before import.
      </p>
      <label
        htmlFor="files"
        className="mt-6 flex cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed border-indigo-300 bg-indigo-50 px-6 py-12 text-center transition hover:border-indigo-500 dark:border-indigo-500/50 dark:bg-indigo-500/10"
      >
        <span className="font-semibold">Drop files here or choose files</span>
        <span className="mt-1 text-sm text-slate-600">Your source files stay local.</span>
        <input
          id="files"
          type="file"
          multiple
          className="sr-only"
          onChange={(e) => collect(e.target.files)}
        />
      </label>
      {busy ? (
        <div
          role="status"
          aria-label="Processing files"
          className="mt-4 h-3 w-48 animate-pulse rounded-full bg-slate-200 dark:bg-slate-700"
        />
      ) : null}
      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-700"
        >
          {error}
        </p>
      ) : null}
      {message ? (
        <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-emerald-900">
          {message}
        </p>
      ) : null}
      {preview ? (
        <section className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              Review {preview.interactions.length} interactions
            </h2>
            <button
              type="button"
              disabled={!files.length || busy}
              onClick={submit}
              className="rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white disabled:opacity-60"
            >
              Import
            </button>
          </div>
          {preview.errors.length ? (
            <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              {preview.errors.join(" ")}
            </p>
          ) : null}
          <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#171d2c]">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="p-3">Date</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Title</th>
                  <th className="p-3">Participants</th>
                </tr>
              </thead>
              <tbody>
                {preview.interactions.map((interaction) => {
                  const row = importPreviewRow(interaction);
                  return (
                    <tr key={interaction.sourceId} className="border-t">
                      <td className="p-3">{row.date}</td>
                      <td className="p-3 capitalize">{row.type}</td>
                      <td className="p-3 font-medium">{row.title}</td>
                      <td className="p-3 text-slate-600">{row.participants}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </>
  );
}
