import { storageManager } from "../lib/storageManager";

const apiBaseUrlEl = document.getElementById("apiBaseUrl") as HTMLInputElement;
const captureIntervalEl = document.getElementById("captureInterval") as HTMLInputElement;
const jpegQualityEl = document.getElementById("jpegQuality") as HTMLInputElement;
const savedLabel = document.getElementById("savedLabel") as HTMLSpanElement;

async function load(): Promise<void> {
  const settings = await storageManager.getSettings();
  apiBaseUrlEl.value = settings.apiBaseUrl;
  captureIntervalEl.value = String(settings.captureIntervalSeconds);
  jpegQualityEl.value = String(settings.jpegQuality);
}

document.getElementById("saveBtn")!.addEventListener("click", async () => {
  await storageManager.setSettings({
    apiBaseUrl: apiBaseUrlEl.value,
    captureIntervalSeconds: Number(captureIntervalEl.value) || 60,
    jpegQuality: Number(jpegQualityEl.value) || 0.6,
  });
  savedLabel.style.display = "inline";
  setTimeout(() => (savedLabel.style.display = "none"), 1500);
});

void load();
