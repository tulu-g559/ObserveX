import { useStats } from "../hooks/queries";

export function StatisticsPage() {
  const { data: stats, isLoading } = useStats();
  const max = stats?.top_activities?.[0]?.count ?? 1;

  return (
    <div>
      <header className="mb-8">
        <h2 className="font-serif text-3xl">Statistics</h2>
        <p className="text-muted text-sm mt-1">Where your time actually went.</p>
      </header>

      {isLoading && <p className="text-muted text-sm">Loading…</p>}

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="card">
          <p className="text-xs text-muted uppercase tracking-wide">Total Events</p>
          <p className="text-3xl font-serif mt-2">{stats?.total_events ?? "—"}</p>
        </div>
        <div className="card">
          <p className="text-xs text-muted uppercase tracking-wide">Total Sessions</p>
          <p className="text-3xl font-serif mt-2">{stats?.total_sessions ?? "—"}</p>
        </div>
      </div>

      <div className="card">
        <p className="text-xs text-muted uppercase tracking-wide mb-4">Activity Distribution</p>
        <div className="flex flex-col gap-3">
          {stats?.top_activities?.map((a) => (
            <div key={a.activity}>
              <div className="flex justify-between text-sm mb-1">
                <span className="capitalize">{a.activity}</span>
                <span className="text-muted">{a.count}</span>
              </div>
              <div className="h-2 rounded-full bg-[#faf6ea]">
                <div
                  className="h-2 rounded-full bg-accent"
                  style={{ width: `${(a.count / max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
