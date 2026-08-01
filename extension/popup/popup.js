// src/popup/popup.ts
async function refreshStatus() {
  const response = await chrome.runtime.sendMessage({
    type: "OBSERVEX_STATUS_REQUEST"
  });
  const dot = document.getElementById("statusDot");
  const text = document.getElementById("statusText");
  const queueCount = document.getElementById("queueCount");
  dot.className = `dot ${response.enabled ? "on" : "off"}`;
  text.textContent = response.enabled ? "Active" : "Paused";
  queueCount.textContent = String(response.queueLength);
}
document.getElementById("toggleBtn").addEventListener("click", async () => {
  const response = await chrome.runtime.sendMessage({
    type: "OBSERVEX_STATUS_REQUEST"
  });
  await chrome.runtime.sendMessage({
    type: "OBSERVEX_TOGGLE_ENABLED",
    enabled: !response.enabled
  });
  await refreshStatus();
});
void refreshStatus();
//# sourceMappingURL=popup.js.map
