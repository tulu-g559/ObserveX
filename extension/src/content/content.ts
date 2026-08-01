import { BackgroundMessage } from "../lib/types";

// Content script stays intentionally dumb: capture + compress + upload only
// happens in the background worker / backend. This script just forwards
// meaningful DOM signals.

function send(eventType: "click" | "form_submit"): void {
  const message: BackgroundMessage = {
    type: "OBSERVEX_ACTIVITY_EVENT",
    payload: {
      sessionId: "", // background fills the real session id
      url: window.location.href,
      pageTitle: document.title,
      eventType,
      timestamp: new Date().toISOString(),
    },
  };
  chrome.runtime.sendMessage(message).catch(() => {
    // background may be waking up; safe to ignore, next event will retry
  });
}

let lastClickAt = 0;
document.addEventListener(
  "click",
  () => {
    const now = Date.now();
    if (now - lastClickAt < 2000) return; // debounce rapid clicks
    lastClickAt = now;
    send("click");
  },
  { capture: true }
);

document.addEventListener(
  "submit",
  () => {
    send("form_submit");
  },
  { capture: true }
);
