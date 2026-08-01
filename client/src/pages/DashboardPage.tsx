import { ActivityCard } from "../components/ActivityCard";
import { useActivities, useStats } from "../hooks/queries";

export function DashboardPage() {
  const { data: activities, isLoading } = useActivities(8);
  const { data: stats } = useStats();

  return (
    <div>
      <header className="mb-8">
        <h2 className="font-serif text-3xl">Today's Summary</h2>
        <p className="text-muted text-sm mt-1">A clear picture of how your day unfolded.</p>
      </header>

      <div className="grid grid-cols-3 gap-4 mb-10">
        <div className="card">
          <p className="text-xs text-muted uppercase tracking-wide">Events Logged</p>
          <p className="text-3xl font-serif mt-2">{stats?.total_events ?? "—"}</p>
        </div>
        <div className="card">
          <p className="text-xs text-muted uppercase tracking-wide">Sessions</p>
          <p className="text-3xl font-serif mt-2">{stats?.total_sessions ?? "—"}</p>
        </div>
        <div className="card">
          <p className="text-xs text-muted uppercase tracking-wide">Top Activity</p>
          <p className="text-3xl font-serif mt-2 capitalize">
            {stats?.top_activities?.[0]?.activity ?? "—"}
          </p>
        </div>
      </div>

      <h3 className="font-serif text-xl mb-4">Recent Activities</h3>
      <div className="flex flex-col gap-3">
        {isLoading && <p className="text-muted text-sm">Loading…</p>}
        {activities?.map((a) => (
          <ActivityCard key={a.id} activity={a} />
        ))}
        {activities?.length === 0 && <p className="text-muted text-sm">Nothing captured yet.</p>}
      </div>
    </div>
  );
}
