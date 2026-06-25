// ============================================================
// IPM Overlay Assistant — Content Script
// Maximiza janela interna do IPM via CSS + clique
// ============================================================

(function () {
  'use strict';

  if (!location.hostname.includes('atende.net')) return;

  console.log('[IPM] 🚀 Content Script v5 iniciado');

  // ============================================================
  // 1. TRIGGER
  // ============================================================
  let maximizePending = false;

  document.addEventListener('click', (event) => {
    try {
      const trigger = event.target.closest(
        '.botao-acao-base.fa-plus, .fa-plus.botao-acao-base, ' +
        '.div_botao_acao_button.fa-plus'
      );
      if (!trigger) return;
      console.log('[IPM] ⚡ Novo Processo clicado!');
      maximizePending = true;
      chrome.runtime.sendMessage({ type: 'TRIGGER_CLICKED' }).catch(() => {});
    } catch (e) {}
  }, true);

  // ============================================================
  // 2. MAXIMIZAR — VÁRIAS ESTRATÉGIAS
  // ============================================================

  function maximizeJanela(janela) {
    if (!janela || !janela.offsetParent) return false;

    const id = janela.id;
    console.log(`[IPM] 🔧 Maximizando: ${id}`);

    // ─── ESTRATÉGIA 1: CSS DIRETO — forçar tela cheia ───
    // Pega o container onde as janelas ficam
    const container = janela.parentElement?.closest('[class*="area">], .area-principal, main, [class*="workspace"]') ||
                      janela.parentElement;

    // Janela principal (o div da janela em si)
    const areaTotal = janela.querySelector('.area_total_janela') || janela;

    // Aplica CSS fullscreen no container da janela
    janela.style.setProperty('position', 'fixed', 'important');
    janela.style.setProperty('top', '0', 'important');
    janela.style.setProperty('left', '0', 'important');
    janela.style.setProperty('width', '100vw', 'important');
    janela.style.setProperty('height', '100vh', 'important');
    janela.style.setProperty('z-index', '99999', 'important');
    janela.style.setProperty('margin', '0', 'important');

    if (areaTotal !== janela) {
      areaTotal.style.setProperty('width', '100%', 'important');
      areaTotal.style.setProperty('height', '100%', 'important');
    }

    console.log(`[IPM] ✅ CSS position fixed aplicado em ${id}`);
    return true;
  }

  function clickMaximizeButton(janela) {
    if (!janela) return false;

    // Tenta todos os spans/inputs no header aside
    const aside = janela.querySelector('header aside');
    if (!aside) {
      console.log('[IPM] ⚠️ Nenhum <aside> encontrado no header');
      return false;
    }

    const inputs = aside.querySelectorAll('input');
    console.log(`[IPM] 🔎 ${inputs.length} input(s) no header aside:`);
    inputs.forEach((inp, i) => {
      console.log(`[IPM]   input ${i}: value="${inp.value}" type="${inp.type}" onclick="${inp.getAttribute('onclick')?.substring(0, 80) || 'nenhum'}"`);
    });

    // Tenta cada input — se algum funcionar (a janela mudar de tamanho), paramos
    const rectBefore = janela.getBoundingClientRect();

    for (const inp of inputs) {
      if (inp.offsetWidth > 0 && inp.offsetHeight > 0) {
        inp.click();
        // Pequena pausa pra ver se algo mudou
      }
    }

    // Verifica se a janela mudou depois dos cliques
    // Se não mudou, aplica CSS
    const rectAfter = janela.getBoundingClientRect();
    if (rectAfter.width === rectBefore.width && rectAfter.height === rectBefore.height) {
      console.log('[IPM] ⚠️ Nenhum input alterou o tamanho — aplicando CSS direto');
      return maximizeJanela(janela);
    }

    return true;
  }

  function tryAllStrategies() {
    const janelas = document.querySelectorAll('[id^="janela_"]');
    let maximized = false;

    for (const janela of janelas) {
      if (janela.offsetWidth === 0 && janela.offsetHeight === 0) continue;

      // Tenta clicar nos inputs do header (abordagem original)
      const result = clickMaximizeButton(janela);
      if (result) maximized = true;
    }

    return maximized;
  }

  // ============================================================
  // 3. MUTATION OBSERVER
  // ============================================================

  let attempts = 0;
  const MAX_ATTEMPTS = 15;

  function startMaximize() {
    attempts = 0;

    // Tenta imediatamente
    if (tryAllStrategies()) return;

    // Retenta
    const iv = setInterval(() => {
      attempts++;
      if (tryAllStrategies() || attempts >= MAX_ATTEMPTS) {
        clearInterval(iv);
        if (attempts >= MAX_ATTEMPTS) {
          console.warn('[IPM] ⚠️ Esgotadas tentativas de maximizar');
        }
      }
    }, 500);
  }

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
