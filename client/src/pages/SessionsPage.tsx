import { useSessions } from "../hooks/queries";

function formatDuration(start: string, end: string | null): string {
  const startMs = new Date(start).getTime();
  const endMs = end ? new Date(end).getTime() : Date.now();
  const minutes = Math.round((endMs - startMs) / 60000);
  return minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

export function SessionsPage() {
  const { data: sessions, isLoading } = useSessions();

  return (
    <div>
      <header className="mb-8">
        <h2 className="font-serif text-3xl">Sessions</h2>
        <p className="text-muted text-sm mt-1">Each browsing session, start to finish.</p>
      </header>

      {isLoading && <p className="text-muted text-sm">Loading…</p>}

      <div className="flex flex-col gap-3">
        {sessions?.map((s) => (
          <div key={s.id} className="card flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{new Date(s.start_time).toLocaleString()}</p>
              <p className="text-xs text-muted mt-1">Session {s.id.slice(0, 8)}</p>
            </div>
            <span className="text-xs px-2 py-1 rounded-full bg-accent-light text-accent-dark font-medium">
              {formatDuration(s.start_time, s.end_time)}
            </span>
          </div>
        ))}
        {sessions?.length === 0 && <p className="text-muted text-sm">No sessions yet.</p>}
      </div>
    </div>
  );
}
