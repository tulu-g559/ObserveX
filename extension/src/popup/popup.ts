import { BackgroundMessage } from "../lib/types";

async function refreshStatus(): Promise<void> {
  const response = (await chrome.runtime.sendMessage({
    type: "OBSERVEX_STATUS_REQUEST",
  } satisfies BackgroundMessage)) as { queueLength: number; enabled: boolean };

  const dot = document.getElementById("statusDot")!;
  const text = document.getElementById("statusText")!;
  const queueCount = document.getElementById("queueCount")!;

  dot.className = `dot ${response.enabled ? "on" : "off"}`;
  text.textContent = response.enabled ? "Active" : "Paused";
  queueCount.textContent = String(response.queueLength);
}

document.getElementById("toggleBtn")!.addEventListener("click", async () => {
  const response = (await chrome.runtime.sendMessage({
    type: "OBSERVEX_STATUS_REQUEST",
  } satisfies BackgroundMessage)) as { enabled: boolean };

  await chrome.runtime.sendMessage({
    type: "OBSERVEX_TOGGLE_ENABLED",
    enabled: !response.enabled,
  } satisfies BackgroundMessage);

  await refreshStatus();
});

void refreshStatus();
