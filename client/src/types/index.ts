export interface ActivityEvent {
  id: string;
  session_id: string;
  timestamp: string;
  url: string;
  page_title: string;
  event_type: string;
}

export interface AIResult {
  id: string;
  activity_id: string;
  activity: string;
  application: string;
  page_title: string;
  summary: string;
  tags: string[];
  confidence: number;
  source: string;
  created_at: string;
}

export interface ActivityDetail {
  event: ActivityEvent;
  ai_result: AIResult | null;
  screenshot: string | null;
}

export interface SessionItem {
  id: string;
  user_id: string;
  start_time: string;
  end_time: string | null;
}

export interface Stats {
  total_events: number;
  total_sessions: number;
  top_activities: { activity: string; count: number }[];
  top_tags: { tag: string; count: number }[];
}
