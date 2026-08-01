import { useState } from "react";

export function SettingsPage() {
  const [apiUrl, setApiUrl] = useState(import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000");

  return (
    <div>
      <header className="mb-8">
        <h2 className="font-serif text-3xl">Settings</h2>
        <p className="text-muted text-sm mt-1">Configure how ObserveX talks to your backend.</p>
      </header>

      <div className="card max-w-md">
        <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-2">
          API Base URL
        </label>
        <input
          value={apiUrl}
          onChange={(e) => setApiUrl(e.target.value)}
          className="w-full px-4 py-2 rounded-lg border border-[#efe9d8] text-sm focus:outline-none focus:border-accent"
        />
        <p className="text-xs text-muted mt-3">
          Extension-side settings (capture interval, quality) live in the extension's own Options page.
        </p>
      </div>
    </div>
  );
}
