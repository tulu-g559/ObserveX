import { ActivityCard } from "../components/ActivityCard";
import { useActivities } from "../hooks/queries";
import { ActivityEvent } from "../types";

function groupByDay(activities: ActivityEvent[]): Record<string, ActivityEvent[]> {
  return activities.reduce<Record<string, ActivityEvent[]>>((acc, a) => {
    const day = new Date(a.timestamp).toDateString();
    (acc[day] ??= []).push(a);
    return acc;
  }, {});
}

export function TimelinePage() {
  const { data: activities, isLoading } = useActivities(200);
  const grouped = activities ? groupByDay(activities) : {};

  return (
    <div>
      <header className="mb-8">
        <h2 className="font-serif text-3xl">Timeline</h2>
        <p className="text-muted text-sm mt-1">Everything, in order.</p>
      </header>

      {isLoading && <p className="text-muted text-sm">Loading…</p>}

      {Object.entries(grouped).map(([day, items]) => (
        <section key={day} className="mb-8">
          <h3 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">{day}</h3>
          <div className="flex flex-col gap-3">
            {items.map((a) => (
              <ActivityCard key={a.id} activity={a} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
