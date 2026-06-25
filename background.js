// ============================================================
// IPM Overlay Assistant — Service Worker (Background)
// Agora simplificado — o maximize é feito pelo content script
// ============================================================

let triggerState = { active: false, timestamp: 0 };

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'TRIGGER_CLICKED':
      console.log('[IPM] ⚡ Trigger recebido');
      triggerState = { active: true, timestamp: Date.now() };
      setTimeout(() => { triggerState.active = false; }, 20000);
      sendResponse({ success: true });
      break;

    case 'GET_STATUS':
      chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
        sendResponse({
          triggerActive: triggerState.active,
          triggerAge: triggerState.active ? Date.now() - triggerState.timestamp : 0,
          url: tab?.url || 'unknown'
        });
      });
      return true;
  }
  return true;
});
