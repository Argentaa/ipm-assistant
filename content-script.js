// ============================================================
// IPM Overlay Assistant — Content Script
// Apenas CSS — NÃO clica em nenhum botão do sistema
// ============================================================

(function () {
  'use strict';

  if (!location.hostname.includes('atende.net')) return;

  console.log('[IPM] 🚀 Content Script v6 - CSS only');

  let maximizePending = false;

  // ============================================================
  // 1. TRIGGER — detecta clique em "Novo Processo"
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
  // 2. MAXIMIZA — APENAS CSS, sem clicar em nada
  // ============================================================
  function makeFullScreen(janela) {
    if (!janela || janela.offsetWidth === 0) return false;

    const id = janela.id;
    console.log(`[IPM] 🔧 Aplicando CSS fullscreen em: ${id}`);

    // A área de conteúdo total da janela
    const areaTotal = janela.querySelector('.area_total_janela');
    const bodyJanela = janela.querySelector('.conteudo_janela, .area-conteudo, .corpo_janela') || areaTotal;

    // ─── 1. Janela principal (div #janela_XXXXX) ───
    janela.style.setProperty('position', 'absolute', 'important');
    janela.style.setProperty('top', '0', 'important');
    janela.style.setProperty('left', '0', 'important');
    janela.style.setProperty('width', '100%', 'important');
    janela.style.setProperty('height', '100%', 'important');
    janela.style.setProperty('z-index', '9999', 'important');
    janela.style.setProperty('margin', '0', 'important');
    janela.style.setProperty('border', 'none', 'important');

    // ─── 2. Área total da janela ───
    if (areaTotal) {
      areaTotal.style.setProperty('width', '100%', 'important');
      areaTotal.style.setProperty('height', '100%', 'important');
    }

    // ─── 3. Força a janela a ficar na frente ───
    const todasJanelas = document.querySelectorAll('[id^="janela_"]');
    todasJanelas.forEach(j => {
      if (j.id !== id) {
        j.style.setProperty('z-index', '1', 'important');
      }
    });

    console.log(`[IPM] ✅ CSS aplicado - janela em tela cheia`);
    return true;
  }

  // ============================================================
  // 3. MUTATION OBSERVER — detecta janela e maximiza
  // ============================================================
  let attempts = 0;
  const MAX_ATTEMPTS = 25; // 12.5 segundos

  function startMaximize() {
    if (!maximizePending) return;
    attempts = 0;

    // Tenta imediatamente
    const janelas = document.querySelectorAll('[id^="janela_"]');
    for (const j of janelas) {
      if (makeFullScreen(j)) {
        maximizePending = false;
        return;
      }
    }

    // Retenta em intervalo
    const iv = setInterval(() => {
      attempts++;
      const janelas = document.querySelectorAll('[id^="janela_"]');
      for (const j of janelas) {
        if (makeFullScreen(j)) {
          maximizePending = false;
          clearInterval(iv);
          return;
        }
      }
      if (attempts >= MAX_ATTEMPTS) {
        clearInterval(iv);
        console.warn('[IPM] ⚠️ Esgotadas tentativas');
      }
    }, 500);
  }

  // MutationObserver
  const observer = new MutationObserver((mutations) => {
    if (!maximizePending) return;
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;
        if (node.id?.startsWith?.('janela_') || node.querySelector?.('[id^="janela_"]')) {
          console.log('[IPM] 🔍 Janela detectada!');
          startMaximize();
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
