import { ApiClient } from "../lib/apiClient";
import { storageManager } from "../lib/storageManager";
import { ActivityPayload, BackgroundMessage, EventType, QueuedUpload } from "../lib/types";

const FLUSH_ALARM = "observex-flush-queue";
const INTERVAL_ALARM = "observex-interval-capture";

let lastUrlByTab = new Map<number, string>();

// ---- capture + enqueue ----------------------------------------------------

async function captureActiveTab(): Promise<string | null> {
  const settings = await storageManager.getSettings();
  try {
    const dataUrl = await chrome.tabs.captureVisibleTab({
      format: "jpeg",
      quality: Math.round(settings.jpegQuality * 100),
    });
    return dataUrl;
  } catch (err) {
    console.warn("[ObserveX] captureVisibleTab failed", err);
    return null;
  }
}

async function recordEvent(tab: chrome.tabs.Tab, eventType: EventType): Promise<void> {
  const settings = await storageManager.getSettings();
  if (!settings.enabled || !tab.url || !tab.active) return;
  if (tab.url.startsWith("chrome://") || tab.url.startsWith("chrome-extension://")) return;

  const sessionId = await storageManager.getOrCreateSessionId();
  const screenshotDataUrl = await captureActiveTab();
  if (!screenshotDataUrl) return;

  const payload: ActivityPayload = {
    sessionId,
    url: tab.url,
    pageTitle: tab.title ?? "",
    eventType,
    timestamp: new Date().toISOString(),
  };

  const queued: QueuedUpload = {
    id: crypto.randomUUID(),
    activityPayload: payload,
    screenshotDataUrl,
    attempts: 0,
    createdAt: payload.timestamp,
  };

  await storageManager.enqueue(queued);
  await flushQueue(); // best-effort immediate attempt; offline queue handles failures
}

// ---- upload queue (handles offline / retry) --------------------------------

function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, base64] = dataUrl.split(",");
  const mime = meta.match(/data:(.*);base64/)?.[1] ?? "image/jpeg";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

async function flushQueue(): Promise<void> {
  const settings = await storageManager.getSettings();
  const client = new ApiClient(settings.apiBaseUrl);
  const queue = await storageManager.getQueue();

  const remaining: QueuedUpload[] = [];

  for (const item of queue) {
    try {
      const activity = await client.createActivity(item.activityPayload);
      const blob = dataUrlToBlob(item.screenshotDataUrl);
      await client.uploadScreenshot(activity.id, blob);
      // success -> drop from queue
    } catch (err) {
      item.attempts += 1;
      if (item.attempts < 5) {
        remaining.push(item); // retry later
      } else {
        console.warn("[ObserveX] dropping upload after max retries", item.id);
      }
    }
  }

  await storageManager.setQueue(remaining);
}

// ---- event listeners --------------------------------------------------------

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

chrome.runtime.onMessage.addListener((message: BackgroundMessage, _sender, sendResponse) => {
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
        enabled: settings.enabled,
      });
    })();
    return true; // keep channel open for async sendResponse
  }

  if (message.type === "OBSERVEX_TOGGLE_ENABLED") {
    void storageManager.setSettings({ enabled: message.enabled });
    return false;
  }

  return false;
});

// ---- init -------------------------------------------------------------------

chrome.runtime.onInstalled.addListener(async () => {
  await chrome.alarms.create(FLUSH_ALARM, { periodInMinutes: 1 });
  const settings = await storageManager.getSettings();
  await chrome.alarms.create(INTERVAL_ALARM, {
    periodInMinutes: Math.max(1, settings.captureIntervalSeconds / 60),
  });
  console.log("[ObserveX] installed - service worker ready");
});
