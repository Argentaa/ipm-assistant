// ============================================================
// IPM Overlay Assistant — Background
// Injeta maximize.js no MAIN WORLD via scripting API
// ============================================================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'MAXIMIZE':
      if (!sender.tab?.id) break;
      console.log('[IPM] ⚡ MAXIMIZE recebido — injetando no main world...');

      chrome.scripting.executeScript({
        target: { tabId: sender.tab.id },
        world: 'MAIN',
        files: ['maximize.js']
      }).then(() => {
        console.log('[IPM] ✅ maximize.js injetado no main world');
      }).catch(err => {
        console.error('[IPM] ❌ Erro ao injetar:', err.message);
      });

      sendResponse({ success: true });
      break;

    case 'GET_STATUS':
      chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
        sendResponse({ url: tab?.url || 'unknown' });
      });
      return true;
  }
  return true;
});
