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

// src/options/options.ts
var apiBaseUrlEl = document.getElementById("apiBaseUrl");
var captureIntervalEl = document.getElementById("captureInterval");
var jpegQualityEl = document.getElementById("jpegQuality");
var savedLabel = document.getElementById("savedLabel");
async function load() {
  const settings = await storageManager.getSettings();
  apiBaseUrlEl.value = settings.apiBaseUrl;
  captureIntervalEl.value = String(settings.captureIntervalSeconds);
  jpegQualityEl.value = String(settings.jpegQuality);
}
document.getElementById("saveBtn").addEventListener("click", async () => {
  await storageManager.setSettings({
    apiBaseUrl: apiBaseUrlEl.value,
    captureIntervalSeconds: Number(captureIntervalEl.value) || 60,
    jpegQuality: Number(jpegQualityEl.value) || 0.6
  });
  savedLabel.style.display = "inline";
  setTimeout(() => savedLabel.style.display = "none", 1500);
});
void load();
//# sourceMappingURL=options.js.map
