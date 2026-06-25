// ============================================================
// IPM Overlay Assistant — Content Script
// Detecta clique + maximiza janela INTERNA do IPM
// ============================================================

(function () {
  'use strict';

  if (!location.hostname.includes('atende.net')) return;

  console.log('[IPM] 🚀 Content Script v4 iniciado');

  // ============================================================
  // 1. TRIGGER — detecta clique em "Novo Processo"
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

      chrome.runtime.sendMessage({ type: 'TRIGGER_CLICKED' })
        .catch(() => {});
    } catch (e) {
      console.warn('[IPM] ⚠️ Erro trigger:', e.message);
    }
  }, true);

  // ============================================================
  // 2. MUTATION OBSERVER — detecta e maximiza janela interna
  // ============================================================

  function debugMaximize() {
    // 1. Lista TODAS as janelas encontradas
    const janelas = document.querySelectorAll('[id^="janela_"]');
    console.log(`[IPM] 🔎 ${janelas.length} janela(s) encontrada(s):`);
    janelas.forEach((j, i) => {
      console.log(`[IPM]   ${i}: id="${j.id}" visivel=${j.offsetWidth > 0}`);

      // Tenta achar o maximize por diferentes caminhos
      const btn1 = j.querySelector('div.area_total_janela header aside span:nth-child(2)');
      const btn2 = j.querySelector('header aside span:nth-child(2)');
      const btn3 = j.querySelector('[class*="maximizar"], [class*="maximize"]');
      const btn4 = j.querySelector('span.botao_maximizar, .botao-maximizar, .maximizar');
      const btn5 = j.querySelector('i.fa-expand, i.fa-window-maximize');

      if (btn1) console.log(`[IPM]   ✅ btn1 (area_total_janela):`, btn1.outerHTML?.substring(0, 100));
      if (btn2) console.log(`[IPM]   ✅ btn2 (header aside):`, btn2.outerHTML?.substring(0, 100));
      if (btn3) console.log(`[IPM]   ✅ btn3 (classe maximizar):`, btn3.outerHTML?.substring(0, 100));
      if (btn4) console.log(`[IPM]   ✅ btn4 (botao_maximizar):`, btn4.outerHTML?.substring(0, 100));
      if (btn5) console.log(`[IPM]   ✅ btn5 (fa-expand):`, btn5.outerHTML?.substring(0, 100));

      // Mostra a estrutura do header
      const header = j.querySelector('header');
      if (header) {
        console.log(`[IPM]   📋 Header HTML:`, header.innerHTML?.substring(0, 300));
      } else {
        console.log(`[IPM]   ⚠️ Nenhum <header> encontrado na janela`);
        // Mostra os primeiros 500 chars do HTML da janela
        console.log(`[IPM]   📋 HTML parcial da janela:`, j.innerHTML?.substring(0, 500));
      }
    });
    return janelas;
  }

  function tryMaximize() {
    const janelas = document.querySelectorAll('[id^="janela_"]');
    if (janelas.length === 0) return false;

    for (const janela of janelas) {
      if (janela.offsetWidth === 0 && janela.offsetHeight === 0) continue; // invisível

      // Tenta vários seletores em ordem
      const selectors = [
        // O input DENTRO do span é o botão verdadeiro
        'div.area_total_janela header aside span:nth-child(2) input',
        'header aside span:nth-child(2) input',
        'header aside input[type="button"], header aside input[type="submit"]',
        'div.area_total_janela header aside span:nth-child(2)',
        'header aside span:nth-child(2)',
        'header aside span',
        'span.botao_maximizar, span.botao-maximizar',
        '[class*="maximizar"], [class*="maximize"]',
        'i.fa-expand, i.fa-window-maximize',
        '[title*="maximizar" i], [title*="maximize" i]',
      ];

      for (const sel of selectors) {
        const btn = janela.querySelector(sel);
        if (btn) {
          const rect = btn.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            btn.click();
            console.log(`[IPM] ✅ Maximizado via seletor: "${sel}"`);
            maximizePending = false;
            return true;
          }
        }
      }

      // Último recurso: span no header que tem onclick
      const header = janela.querySelector('header');
      if (header) {
        const spans = header.querySelectorAll('aside span, span');
        for (const span of spans) {
          const hasClick = span.hasAttribute('onclick') ||
                           span.getAttribute('onclick')?.includes('maxim') ||
                           span.className.includes('maxim') ||
                           span.innerHTML?.includes('maxim');
          if (hasClick && span.offsetWidth > 0) {
            span.click();
            console.log('[IPM] ✅ Maximizado via span com onclick');
            maximizePending = false;
            return true;
          }
        }
      }
    }

    return false;
  }

  let maximizeAttempts = 0;
  const MAX_ATTEMPTS = 20;

  function startMaximizeWatch() {
    maximizeAttempts = 0;

    // Tenta imediatamente
    if (tryMaximize()) return;

    // Se não achou, faz debug da primeira vez e tenta de novo
    if (maximizeAttempts === 0) {
      debugMaximize();
    }

    // Retenta
    const iv = setInterval(() => {
      maximizeAttempts++;
      if (tryMaximize() || maximizeAttempts >= MAX_ATTEMPTS) {
        clearInterval(iv);
        if (maximizeAttempts >= MAX_ATTEMPTS) {
          console.log('[IPM] ⚠️ Não foi possível maximizar. Debug acima mostra a estrutura.');
        }
      }
    }, 500);
  }

  // MutationObserver: detecta quando a janela aparece
  const observer = new MutationObserver((mutations) => {
    if (!maximizePending) return;

    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;

        if (node.id?.startsWith?.('janela_') ||
            node.querySelector?.('[id^="janela_"]')) {
          console.log('[IPM] 🔍 Janela interna detectada!');
          startMaximizeWatch();
          return;
        }
      }
    }
  });

  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
    console.log('[IPM] 👀 Observando...');
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      observer.observe(document.body, { childList: true, subtree: true });
      console.log('[IPM] 👀 Observando...');
    });
  }

  console.log('[IPM] ✅ Pronto!');
})();
