// ============================================================
// IPM Overlay Assistant — Content Script
// Detecta clique + maximiza janela INTERNA do IPM
// ============================================================

(function () {
  'use strict';

  if (!location.hostname.includes('atende.net')) return;

  console.log('[IPM] 🚀 Content Script v3 iniciado');

  // ============================================================
  // CONFIG
  // ============================================================
  const TRIGGER_SELECTOR = '.botao-acao-base.fa-plus, .fa-plus.botao-acao-base';
  let maximizePending = false;

  // ============================================================
  // 1. TRIGGER — detecta clique em "Novo Processo"
  // ============================================================
  document.addEventListener('click', (event) => {
    try {
      const trigger = event.target.closest(TRIGGER_SELECTOR);
      if (!trigger) return;

      console.log('[IPM] ⚡ Novo Processo clicado!');
      maximizePending = true;

      chrome.runtime.sendMessage({ type: 'TRIGGER_CLICKED' })
        .catch(() => {});
    } catch (e) {
      console.warn('[IPM] ⚠️ Erro trigger:', e.message);
    }
  }, true);

  // ============================================================
  // 2. MUTATION OBSERVER — detecta janela interna e maximiza
  // ============================================================
  const MAXIMIZE_TRIES = 15;
  const MAXIMIZE_INTERVAL = 400;

  function tryMaximizeWindow() {
    // Tenta achar a janela interna que acabou de abrir
    // O ID é dinâmico: janela_XXXXX, então busca por prefixo
    const janela = document.querySelector('[id^="janela_"]');
    if (!janela) return false;

    // Tenta achar o botão maximizar dentro da janela
    // Estrutura: #janela_XXXXX > div.area_total_janela > header > aside > span:nth-child(2)
    const maximizeBtn = janela.querySelector(
      'div.area_total_janela header aside span:nth-child(2), ' +
      'header aside span:nth-child(2), ' +
      '[class*="maximizar"], [class*="maximize"], ' +
      '[title*="maximizar"], [title*="maximizar"], [title*="maximize"]'
    );

    if (maximizeBtn) {
      const rect = maximizeBtn.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        maximizeBtn.click();
        console.log('[IPM] ✅ Janela interna maximizada!');
        maximizePending = false;
        return true;
      }
    }
    return false;
  }

  // Observer que detecta quando a janela interna aparece no DOM
  const observer = new MutationObserver((mutations) => {
    if (!maximizePending) return;

    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;

        // Verifica se o novo nó é a janela ou contém ela
        if (node.id?.startsWith?.('janela_') ||
            node.querySelector?.('[id^="janela_"]')) {
          console.log('[IPM] 🔍 Janela interna detectada via MutationObserver!');

          // Tenta maximizar imediatamente
          if (tryMaximizeWindow()) return;

          // Se não conseguiu, tenta algumas vezes (a janela pode estar carregando)
          let tries = 0;
          const iv = setInterval(() => {
            tries++;
            if (tryMaximizeWindow() || tries >= MAXIMIZE_TRIES) {
              clearInterval(iv);
              if (tries >= MAXIMIZE_TRIES) {
                console.warn('[IPM] ⚠️ Não consegui maximizar após várias tentativas');
              }
            }
          }, MAXIMIZE_INTERVAL);
          return;
        }
      }
    }
  });

  function startObserver() {
    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: true });
      console.log('[IPM] 👀 MutationObserver ativo');
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        observer.observe(document.body, { childList: true, subtree: true });
        console.log('[IPM] 👀 MutationObserver ativo (após DOMContentLoaded)');
      });
    }
  }

  // ============================================================
  // 3. INICIALIZAÇÃO
  // ============================================================
  startObserver();
  console.log('[IPM] ✅ Pronto! Clique em Novo Processo para testar.');
})();
