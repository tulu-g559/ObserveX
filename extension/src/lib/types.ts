export type EventType =
  | "url_change"
  | "tab_switch"
  | "click"
  | "idle_resume"
  | "interval"
  | "form_submit";

export interface ActivityPayload {
  sessionId: string;
  url: string;
  pageTitle: string;
  eventType: EventType;
  timestamp: string;
}

export interface QueuedUpload {
  id: string;
  activityPayload: ActivityPayload;
  screenshotDataUrl: string;
  attempts: number;
  createdAt: string;
}

export interface ObserveXSettings {
  enabled: boolean;
  apiBaseUrl: string;
  captureIntervalSeconds: number;
  jpegQuality: number;
}

export const DEFAULT_SETTINGS: ObserveXSettings = {
  enabled: true,
  apiBaseUrl: "http://localhost:8000",
  captureIntervalSeconds: 60,
  jpegQuality: 0.6,
};

export type BackgroundMessage =
  | { type: "OBSERVEX_STATUS_REQUEST" }
  | { type: "OBSERVEX_STATUS_RESPONSE"; queueLength: number; enabled: boolean }
  | { type: "OBSERVEX_TOGGLE_ENABLED"; enabled: boolean }
  | { type: "OBSERVEX_ACTIVITY_EVENT"; payload: ActivityPayload };
