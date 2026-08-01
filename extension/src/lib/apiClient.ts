import { ActivityPayload } from "./types";

export interface CreateActivityResponse {
  id: string;
  session_id: string;
}

export class ApiClient {
  constructor(private baseUrl: string) {}

  async createActivity(payload: ActivityPayload): Promise<CreateActivityResponse> {
    const res = await fetch(`${this.baseUrl}/activity`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: payload.sessionId,
        url: payload.url,
        page_title: payload.pageTitle,
        event_type: payload.eventType,
        timestamp: payload.timestamp,
      }),
    });

    if (!res.ok) {
      throw new Error(`createActivity failed: ${res.status}`);
    }
    return res.json();
  }

  async uploadScreenshot(activityId: string, blob: Blob): Promise<void> {
    const form = new FormData();
    form.append("file", blob, "screenshot.jpg");

    const res = await fetch(`${this.baseUrl}/upload?activity_id=${activityId}`, {
      method: "POST",
      body: form,
    });

    if (!res.ok) {
      throw new Error(`upload failed: ${res.status}`);
    }
  }
}
