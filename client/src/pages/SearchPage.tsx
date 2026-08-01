import { useState } from "react";
import { useSearch } from "../hooks/queries";

export function SearchPage() {
  const [query, setQuery] = useState("");
  const { data: results, isLoading } = useSearch(query);

  return (
    <div>
      <header className="mb-8">
        <h2 className="font-serif text-3xl">Search</h2>
        <p className="text-muted text-sm mt-1">Find any moment by what happened, not just when.</p>
      </header>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by activity, summary, or tag…"
        className="w-full px-4 py-3 rounded-xl2 border border-[#efe9d8] mb-6 text-sm focus:outline-none focus:border-accent"
      />

      {isLoading && <p className="text-muted text-sm">Searching…</p>}

      <div className="flex flex-col gap-3">
        {results?.map((r) => (
          <div key={r.id} className="card">
            <p className="text-sm font-medium capitalize">{r.activity}</p>
            <p className="text-sm text-ink/80 mt-1">{r.summary}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {r.tags.map((tag) => (
                <span key={tag} className="text-xs px-2 py-1 rounded-full bg-accent-light text-accent-dark">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        ))}
        {query.length > 1 && results?.length === 0 && (
          <p className="text-muted text-sm">No matches for "{query}".</p>
        )}
      </div>
    </div>
  );
}
