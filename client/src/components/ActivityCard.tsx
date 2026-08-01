import { Link } from "react-router-dom";
import { ActivityEvent } from "../types";

const EVENT_LABEL: Record<string, string> = {
  url_change: "Navigated",
  tab_switch: "Switched tab",
  click: "Clicked",
  idle_resume: "Resumed",
  interval: "Snapshot",
  form_submit: "Submitted form",
};

export function ActivityCard({ activity }: { activity: ActivityEvent }) {
  return (
    <Link
      to={`/activity/${activity.id}`}
      className="card flex items-center justify-between hover:border-accent/40 transition-colors"
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink truncate">{activity.page_title || activity.url}</p>
        <p className="text-xs text-muted truncate">{activity.url}</p>
      </div>
      <div className="text-right shrink-0 ml-4">
        <span className="inline-block text-xs px-2 py-1 rounded-full bg-accent-light text-accent-dark font-medium">
          {EVENT_LABEL[activity.event_type] ?? activity.event_type}
        </span>
        <p className="text-xs text-muted mt-1">{new Date(activity.timestamp).toLocaleTimeString()}</p>
      </div>
    </Link>
  );
}
