// src/lib/apiClient.ts
var ApiClient = class {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
  }
  async createActivity(payload) {
    const res = await fetch(`${this.baseUrl}/activity`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: payload.sessionId,
        url: payload.url,
        page_title: payload.pageTitle,
        event_type: payload.eventType,
        timestamp: payload.timestamp
      })
    });
    if (!res.ok) {
      throw new Error(`createActivity failed: ${res.status}`);
    }
    return res.json();
  }
  async uploadScreenshot(activityId, blob) {
    const form = new FormData();
    form.append("file", blob, "screenshot.jpg");
    const res = await fetch(`${this.baseUrl}/upload?activity_id=${activityId}`, {
      method: "POST",
      body: form
    });
    if (!res.ok) {
      throw new Error(`upload failed: ${res.status}`);
    }
  }
};

// src/lib/types.ts
var DEFAULT_SETTINGS = {
  enabled: true,
  apiBaseUrl: "http://localhost:8000",
  captureIntervalSeconds: 60,
  jpegQuality: 0.6
};

// src/lib/storageManager.ts
var SETTINGS_KEY = "observex_settings";
var QUEUE_KEY = "observex_queue";
var SESSION_KEY = "observex_session_id";
var StorageManager = class {
  async getSettings() {
    const stored = await chrome.storage.local.get(SETTINGS_KEY);
    return { ...DEFAULT_SETTINGS, ...stored[SETTINGS_KEY] ?? {} };
  }
  async setSettings(partial) {
    const current = await this.getSettings();
    const next = { ...current, ...partial };
    await chrome.storage.local.set({ [SETTINGS_KEY]: next });
    return next;
  }
  async getQueue() {
    const stored = await chrome.storage.local.get(QUEUE_KEY);
    return stored[QUEUE_KEY] ?? [];
  }
  async enqueue(item) {
    const queue = await this.getQueue();
    queue.push(item);
    await chrome.storage.local.set({ [QUEUE_KEY]: queue });
  }
  async setQueue(queue) {
    await chrome.storage.local.set({ [QUEUE_KEY]: queue });
  }
  async removeFromQueue(id) {
    const queue = await this.getQueue();
    await this.setQueue(queue.filter((q) => q.id !== id));
  }
  async getOrCreateSessionId() {
    const stored = await chrome.storage.local.get(SESSION_KEY);
    if (stored[SESSION_KEY]) return stored[SESSION_KEY];
    const id = crypto.randomUUID();
    await chrome.storage.local.set({ [SESSION_KEY]: id });
    return id;
  }
  async resetSession() {
    const id = crypto.randomUUID();
    await chrome.storage.local.set({ [SESSION_KEY]: id });
    return id;
  }
};
var storageManager = new StorageManager();

// src/background/background.ts
var FLUSH_ALARM = "observex-flush-queue";
var INTERVAL_ALARM = "observex-interval-capture";
var lastUrlByTab = /* @__PURE__ */ new Map();
async function captureActiveTab() {
  const settings = await storageManager.getSettings();
  try {
    const dataUrl = await chrome.tabs.captureVisibleTab({
      format: "jpeg",
      quality: Math.round(settings.jpegQuality * 100)
    });
    return dataUrl;
  } catch (err) {
    console.warn("[ObserveX] captureVisibleTab failed", err);
    return null;
  }
}
async function recordEvent(tab, eventType) {
  const settings = await storageManager.getSettings();
  if (!settings.enabled || !tab.url || !tab.active) return;
  if (tab.url.startsWith("chrome://") || tab.url.startsWith("chrome-extension://")) return;
  const sessionId = await storageManager.getOrCreateSessionId();
  const screenshotDataUrl = await captureActiveTab();
  if (!screenshotDataUrl) return;
  const payload = {
    sessionId,
    url: tab.url,
    pageTitle: tab.title ?? "",
    eventType,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
  const queued = {
    id: crypto.randomUUID(),
    activityPayload: payload,
    screenshotDataUrl,
    attempts: 0,
    createdAt: payload.timestamp
  };
  await storageManager.enqueue(queued);
  await flushQueue();
}
function dataUrlToBlob(dataUrl) {
  const [meta, base64] = dataUrl.split(",");
  const mime = meta.match(/data:(.*);base64/)?.[1] ?? "image/jpeg";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}
async function flushQueue() {
  const settings = await storageManager.getSettings();
  const client = new ApiClient(settings.apiBaseUrl);
  const queue = await storageManager.getQueue();
  const remaining = [];
  for (const item of queue) {
    try {
      const activity = await client.createActivity(item.activityPayload);
      const blob = dataUrlToBlob(item.screenshotDataUrl);
      await client.uploadScreenshot(activity.id, blob);
    } catch (err) {
      item.attempts += 1;
      if (item.attempts < 5) {
        remaining.push(item);
      } else {
        console.warn("[ObserveX] dropping upload after max retries", item.id);
      }
    }
  }
  await storageManager.setQueue(remaining);
}
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete") return;
  const previous = lastUrlByTab.get(tabId);
  if (previous !== tab.url) {
    lastUrlByTab.set(tabId, tab.url ?? "");
    void recordEvent(tab, "url_change");
  }
});
chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  const tab = await chrome.tabs.get(tabId);
  void recordEvent(tab, "tab_switch");
});
chrome.idle.onStateChanged.addListener(async (state) => {
  if (state === "active") {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) void recordEvent(tab, "idle_resume");
  }
});
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === FLUSH_ALARM) {
    void flushQueue();
  }
  if (alarm.name === INTERVAL_ALARM) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) void recordEvent(tab, "interval");
  }
});
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "OBSERVEX_ACTIVITY_EVENT") {
    void (async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab) await recordEvent(tab, message.payload.eventType);
    })();
    return false;
  }
  if (message.type === "OBSERVEX_STATUS_REQUEST") {
    void (async () => {
      const settings = await storageManager.getSettings();
      const queue = await storageManager.getQueue();
      sendResponse({
        type: "OBSERVEX_STATUS_RESPONSE",
        queueLength: queue.length,
        enabled: settings.enabled
      });
    })();
    return true;
  }
  if (message.type === "OBSERVEX_TOGGLE_ENABLED") {
    void storageManager.setSettings({ enabled: message.enabled });
    return false;
  }
  return false;
});
chrome.runtime.onInstalled.addListener(async () => {
  await chrome.alarms.create(FLUSH_ALARM, { periodInMinutes: 1 });
  const settings = await storageManager.getSettings();
  await chrome.alarms.create(INTERVAL_ALARM, {
    periodInMinutes: Math.max(1, settings.captureIntervalSeconds / 60)
  });
  console.log("[ObserveX] installed - service worker ready");
});
//# sourceMappingURL=background.js.map
