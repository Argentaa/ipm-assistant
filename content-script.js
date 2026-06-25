// ============================================================
// IPM Overlay Assistant — Content Script
// Detecta clique e manda background injetar no main world
// ============================================================

(function () {
  'use strict';

  if (!location.hostname.includes('atende.net')) return;

  console.log('[IPM] 🚀 Content Script v12');

  document.addEventListener('click', (event) => {
    try {
      const trigger = event.target.closest(
        '.botao-acao-base.fa-plus, .fa-plus.botao-acao-base, ' +
        '.div_botao_acao_button.fa-plus'
      );
      if (!trigger) return;

      console.log('[IPM] ⚡ Novo Processo clicado!');
      chrome.runtime.sendMessage({ type: 'MAXIMIZE' }).catch(() => {});
    } catch (e) {}
  }, true);
})();
