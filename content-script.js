// ============================================================
// IPM Overlay Assistant — Content Script v9
// Clica no input de maximizar via DOM (seletor testado manualmente)
// ============================================================

(function () {
  'use strict';

  if (!location.hostname.includes('atende.net')) return;

  console.log('[IPM] 🚀 Content Script v9');

  let maximizePending = false;

  // ============================================================
  // 1. TRIGGER
  // ============================================================
  document.addEventListener('click', (event) => {
    try {
      const trigger = event.target.closest(
        '.botao-acao-base.fa-plus, .fa-plus.botao-acao-base, ' +
        '.div_botao_acao_button.fa-plus'
      );
      if (!trigger) return;
      console.log('[IPM] ⚡ Novo Processo clicado!');
      maximizePending = true;
    } catch (e) {}
  }, true);

  // ============================================================
  // 2. MAXIMIZA — clica no input DENTRO do span
  //    Seletor CONFIRMADO manualmente pelo usuário:
  //    document.querySelector("#janela_16028_102_1 > div.area_total_janela > header > aside > span:nth-child(2) > input").click()
  //    Adaptado para [id^="janela_"] em vez do ID fixo
  // ============================================================
  const MAXIMIZE_SELECTOR = 'div.area_total_janela > header > aside > span:nth-child(2) > input';

  function tryMaximize() {
    if (!maximizePending) return false;

    // Busca o input de maximizar DIRETAMENTE (sem depender do ID da janela)
    // Seletor confirmado: div.area_total_janela header aside span:nth-child(2) input
    const maximizeInput = document.querySelector(
      'div.area_total_janela header aside span:nth-child(2) input'
    );

    if (!maximizeInput) {
      console.log('[IPM] ⏳ Input de maximizar não encontrado...');
      return false;
    }

    // Verifica se está visível
    if (maximizeInput.offsetWidth === 0 || maximizeInput.offsetHeight === 0) {
      console.log('[IPM] ⏳ Input visível? offsetWidth=' + maximizeInput.offsetWidth);
      return false;
    }

    // CLICA!
    maximizeInput.click();
    console.log('[IPM] ✅ Janela maximizada!');
    maximizePending = false;
    return true;
  }

  // ============================================================
  // 3. MUTATION OBSERVER
  // ============================================================
  let attempts = 0;
  const MAX_ATTEMPTS = 30;

  function startMaximizeLoop() {
    if (!maximizePending) return;
    attempts = 0;

    // Tenta imediatamente
    if (tryMaximize()) return;

    // Retenta até achar o elemento
    const iv = setInterval(() => {
      attempts++;
      if (tryMaximize() || attempts >= MAX_ATTEMPTS) {
        clearInterval(iv);
        if (attempts >= MAX_ATTEMPTS) {
          console.warn('[IPM] ⚠️ Esgotadas tentativas');
        }
      }
    }, 400);
  }

  const observer = new MutationObserver((mutations) => {
    if (!maximizePending) return;
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;
        if (node.id?.startsWith?.('janela_') || node.querySelector?.('[id^="janela_"]')) {
          console.log('[IPM] 🔍 Janela detectada!');
          startMaximizeLoop();
          return;
        }
      }
    }
  });

  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
    console.log('[IPM] 👀 Pronto!');
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      observer.observe(document.body, { childList: true, subtree: true });
      console.log('[IPM] 👀 Pronto!');
    });
  }
})();
