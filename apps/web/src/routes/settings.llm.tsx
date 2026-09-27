import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { getSettings, saveSettings, testSettings } from "../lib/server";
export const Route = createFileRoute("/settings/llm")({
  loader: () => getSettings(),
  component: Settings,
});
function Settings() {
  const settings = Route.useLoaderData();
  const [model, setModel] = useState(settings.model);
  const [fallbackModel, setFallback] = useState(settings.fallbackModel ?? "");
  const [apiKey, setApiKey] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await saveSettings({ data: { model, fallbackModel, apiKey } });
      setApiKey("");
      setMessage("Saved. Your key is stored locally and remains masked here.");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Something went wrong. Check the server log.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function test() {
    setBusy(true);
    setError("");
    try {
      const result = await testSettings();
      setMessage(`Connection test returned: ${result.text}`);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Something went wrong. Check the server log.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="max-w-2xl">
      <p className="text-sm font-semibold text-teal-700">SETTINGS</p>
      <h1 className="mt-2 text-3xl font-semibold">LLM connection</h1>
      <p className="mt-2 text-slate-600">
        Groq is the MVP provider. The API key is saved only in local Waada settings.
      </p>
      <form
        onSubmit={save}
        className="mt-7 space-y-5 rounded-xl border border-slate-200 bg-white p-6"
      >
        <label className="block font-medium" htmlFor="provider">
          Provider
          <select
            id="provider"
            disabled
            value="groq"
            className="mt-2 block w-full rounded-md border border-slate-300 bg-slate-100 px-3 py-2"
          >
            <option>groq</option>
          </select>
        </label>
        <label className="block font-medium" htmlFor="model">
          Model
          <input
            id="model"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2"
            required
          />
        </label>
        <label className="block font-medium" htmlFor="fallback">
          Fallback model
          <input
            id="fallback"
            value={fallbackModel}
            onChange={(e) => setFallback(e.target.value)}
            className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="block font-medium" htmlFor="api-key">
          Groq API key
          <input
            id="api-key"
            type="password"
            autoComplete="new-password"
            placeholder={settings.groqConfigured ? "Configured (masked)" : "Enter API key"}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </label>
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={busy}
            className="rounded-md bg-slate-900 px-4 py-2 font-semibold text-white disabled:opacity-60"
          >
            Save settings
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={test}
            className="rounded-md border border-slate-300 px-4 py-2 font-semibold disabled:opacity-60"
          >
            Test
          </button>
        </div>
        {message ? (
          <p role="status" className="text-emerald-800">
            {message}
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="text-rose-700">
            {error}
          </p>
        ) : null}
      </form>
    </div>
  );
}
