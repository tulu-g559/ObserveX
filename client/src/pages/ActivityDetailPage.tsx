import { useParams } from "react-router-dom";
import { useActivity } from "../hooks/queries";

export function ActivityDetailPage() {
  const { id = "" } = useParams();
  const { data, isLoading } = useActivity(id);

  if (isLoading) return <p className="text-muted text-sm">Loading…</p>;
  if (!data) return <p className="text-muted text-sm">Not found.</p>;

  const { event, ai_result, screenshot } = data;

  return (
    <div>
      <header className="mb-8">
        <h2 className="font-serif text-3xl">{event.page_title || "Untitled Activity"}</h2>
        <p className="text-muted text-sm mt-1">{event.url}</p>
      </header>

      <div className="grid grid-cols-2 gap-6">
        <div className="card">
          <p className="text-xs text-muted uppercase tracking-wide mb-3">Screenshot</p>
          {screenshot ? (
            <div className="rounded-lg bg-[#faf6ea] aspect-video flex items-center justify-center text-xs text-muted">
              {screenshot}
            </div>
          ) : (
            <p className="text-sm text-muted">No screenshot stored.</p>
          )}
        </div>

        <div className="card">
          <p className="text-xs text-muted uppercase tracking-wide mb-3">AI Understanding</p>
          {ai_result ? (
            <>
              <p className="text-sm mb-2">
                <span className="font-semibold capitalize">{ai_result.activity}</span>
                {ai_result.application && <span className="text-muted"> · {ai_result.application}</span>}
              </p>
              <p className="text-sm text-ink/80 mb-3">{ai_result.summary}</p>
              <div className="flex flex-wrap gap-2 mb-3">
                {ai_result.tags.map((tag) => (
                  <span key={tag} className="text-xs px-2 py-1 rounded-full bg-accent-light text-accent-dark">
                    {tag}
                  </span>
                ))}
              </div>
              <p className="text-xs text-muted">
                confidence {(ai_result.confidence * 100).toFixed(0)}% · source {ai_result.source}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted">Still processing…</p>
          )}
        </div>
      </div>
    </div>
  );
}
