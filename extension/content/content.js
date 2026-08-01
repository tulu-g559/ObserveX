// src/content/content.ts
function send(eventType) {
  const message = {
    type: "OBSERVEX_ACTIVITY_EVENT",
    payload: {
      sessionId: "",
      // background fills the real session id
      url: window.location.href,
      pageTitle: document.title,
      eventType,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }
  };
  chrome.runtime.sendMessage(message).catch(() => {
  });
}
var lastClickAt = 0;
document.addEventListener(
  "click",
  () => {
    const now = Date.now();
    if (now - lastClickAt < 2e3) return;
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
//# sourceMappingURL=content.js.map
