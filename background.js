// ============================================================
// IPM Overlay Assistant — Service Worker (Background)
// Maximiza via Chrome API + fallback DOM para garantir
// ============================================================

let triggerState = {
  active: false,
  timestamp: 0,
  senderTabId: null,
  senderWindowId: null
};
const TRIGGER_TIMEOUT = 15000;

// ============================================================
// 1. RECEBE TRIGGER
// ============================================================
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'TRIGGER_CLICKED':
      console.log('[IPM] ⚡ Trigger recebido — vigiando NOVA janela...');
      triggerState = {
        active: true,
        timestamp: Date.now(),
        senderTabId: sender.tab?.id,
        senderWindowId: sender.tab?.windowId
      };
      setTimeout(() => {
        if (triggerState.active) {
          triggerState.active = false;
          console.log('[IPM] ⏰ Trigger expirou');
        }
      }, TRIGGER_TIMEOUT);
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

    case 'FORCE_MAXIMIZE':
      if (sender.tab?.windowId) {
        maximizeWindow(sender.tab.windowId);
        maximizeFallback(sender.tab?.id);
      }
      sendResponse({ success: true });
      break;
  }
  return true;
});

// ============================================================
// 2. DETECTA QUALQUER NOVA JANELA (qualquer tipo)
// ============================================================

// --- Qualquer janela nova, independente do tipo ---
chrome.windows.onCreated.addListener((window) => {
  if (!triggerState.active) return;
  console.log('[IPM] 🪟 Nova janela detectada:', window.id, 'tipo:', window.type);

  // Verifica se a janela é DIFERENTE da original
  if (window.id !== triggerState.senderWindowId) {
    maximizeWindow(window.id);

    // Se já tem tabs, tenta fallback DOM também
    if (window.tabs && window.tabs.length > 0) {
      for (const tab of window.tabs) {
        maximizeFallback(tab.id);
      }
    }
  }
});

// --- Nova aba — verifica se foi criada numa janela diferente ---
chrome.tabs.onCreated.addListener((tab) => {
  if (!triggerState.active) return;

  // Espera um tick pra tab ter windowId definitivo
  setTimeout(() => {
    chrome.tabs.get(tab.id, (tabInfo) => {
      if (chrome.runtime.lastError) return;

      // Só interessa se for numa janela DIFERENTE da original
      if (tabInfo.windowId !== triggerState.senderWindowId) {
        console.log('[IPM] 📑 Nova aba em janela diferente:', tabInfo.windowId);
        maximizeWindow(tabInfo.windowId);
        maximizeFallback(tab.id);
      }
    });
  }, 100);
});

// --- URL carregado — detecta janela que não tinha URL ainda ---
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (!triggerState.active) return;
  if (changeInfo.status !== 'complete') return;
  if (!tab.url || !tab.url.includes('atende.net')) return;

  chrome.tabs.get(tabId, (t) => {
    if (t.windowId !== triggerState.senderWindowId) {
      console.log('[IPM] 📄 Popup carregada:', tab.url);
      maximizeWindow(t.windowId);
      maximizeFallback(tabId);
    }
  });
});

// ============================================================
// 3. MAXIMIZE VIA CHROME API
// ============================================================
function maximizeWindow(windowId) {
  if (!windowId) return;

  console.log('[IPM] 🔄 Maximizando janela', windowId, 'via Chrome API...');

  chrome.windows.get(windowId, (win) => {
    if (chrome.runtime.lastError || !win) return;

    // Se já está maximizada, não precisa fazer nada
    if (win.state === 'maximized') {
      console.log('[IPM] ✅ Janela já está maximizada');
      triggerState.active = false;
      return;
    }

    chrome.windows.update(windowId, { state: 'maximized' }, () => {
      if (chrome.runtime.lastError) {
        console.warn('[IPM] ⚠️ Erro Chrome API, tentando novamente em 2s...');
        setTimeout(() => {
          chrome.windows.update(windowId, { state: 'maximized' }, () => {
            if (chrome.runtime.lastError) {
              console.error('[IPM] ❌ Chrome API falhou nas 2 tentativas');
            } else {
              console.log('[IPM] ✅ Maximizado na 2ª tentativa!');
              triggerState.active = false;
            }
          });
        }, 2000);
      } else {
        console.log('[IPM] ✅ Janela maximizada via Chrome API!');
        triggerState.active = false;
      }
    });
  });
}

// ============================================================
// 4. FALLBACK — Clica no botão maximizar via DOM
//    (caso a Chrome API não resolva)
// ============================================================
function maximizeFallback(tabId) {
  if (!tabId) return;

  // Seletor do botão maximizar (baseado no JS path que vc mandou)
  const MAXIMIZE_SELECTOR = '#janela_16028_102_1 > div.area_total_janela > header > aside > span:nth-child(2)';

  setTimeout(() => {
    chrome.scripting.executeScript({
      target: { tabId },
      func: clickMaximizeButton,
      args: [MAXIMIZE_SELECTOR]
    }).then(() => {
      console.log('[IPM] ✅ Fallback maximize injetado');
    }).catch((err) => {
      console.warn('[IPM] ⚠️ Fallback maximize erro:', err.message);
    });
  }, 3000); // espera 3s pra página carregar
}

// Função que roda dentro da janela filha
function clickMaximizeButton(selector) {
  'use strict';

  function tryClick() {
    try {
      const el = document.querySelector(selector);
      if (el) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          el.click();
          console.log('[IPM] ✅ Maximize fallback clicado com sucesso!');
          return true;
        }
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  // Tenta imediatamente
  if (tryClick()) return;

  // Retenta a cada 500ms (10x)
  let attempts = 0;
  const interval = setInterval(() => {
    attempts++;
    if (tryClick() || attempts >= 10) {
      clearInterval(interval);
    }
  }, 500);
}
