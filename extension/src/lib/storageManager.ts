import { DEFAULT_SETTINGS, ObserveXSettings, QueuedUpload } from "./types";

const SETTINGS_KEY = "observex_settings";
const QUEUE_KEY = "observex_queue";
const SESSION_KEY = "observex_session_id";

export class StorageManager {
  async getSettings(): Promise<ObserveXSettings> {
    const stored = await chrome.storage.local.get(SETTINGS_KEY);
    return { ...DEFAULT_SETTINGS, ...(stored[SETTINGS_KEY] ?? {}) };
  }

  async setSettings(partial: Partial<ObserveXSettings>): Promise<ObserveXSettings> {
    const current = await this.getSettings();
    const next = { ...current, ...partial };
    await chrome.storage.local.set({ [SETTINGS_KEY]: next });
    return next;
  }

  async getQueue(): Promise<QueuedUpload[]> {
    const stored = await chrome.storage.local.get(QUEUE_KEY);
    return stored[QUEUE_KEY] ?? [];
  }

  async enqueue(item: QueuedUpload): Promise<void> {
    const queue = await this.getQueue();
    queue.push(item);
    await chrome.storage.local.set({ [QUEUE_KEY]: queue });
  }

  async setQueue(queue: QueuedUpload[]): Promise<void> {
    await chrome.storage.local.set({ [QUEUE_KEY]: queue });
  }

  async removeFromQueue(id: string): Promise<void> {
    const queue = await this.getQueue();
    await this.setQueue(queue.filter((q) => q.id !== id));
  }

  async getOrCreateSessionId(): Promise<string> {
    const stored = await chrome.storage.local.get(SESSION_KEY);
    if (stored[SESSION_KEY]) return stored[SESSION_KEY] as string;

    const id = crypto.randomUUID();
    await chrome.storage.local.set({ [SESSION_KEY]: id });
    return id;
  }

  async resetSession(): Promise<string> {
    const id = crypto.randomUUID();
    await chrome.storage.local.set({ [SESSION_KEY]: id });
    return id;
  }
}

export const storageManager = new StorageManager();
