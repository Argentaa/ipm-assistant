// ============================================================
// IPM Overlay Assistant — Content Script v10
// Usa o ID EXATO que SEMPRE é o mesmo + main world injection
// ============================================================

(function () {
  'use strict';

  if (!location.hostname.includes('atende.net')) return;

  console.log('[IPM] 🚀 Content Script v10');

  // ─── SELETOR EXATO que funciona no console ───
  const SELECTOR = "#janela_16028_102_1 > div.area_total_janela > header > aside > span:nth-child(2) > input";

  // ─── Injeta script no main world (mesmo contexto do console) ───
  function injectMainWorld(code) {
    const s = document.createElement('script');
    s.textContent = `(${code})();`;
    document.documentElement.appendChild(s);
    s.remove();
  }

  // ─── Injeta o agente de maximize na página ───
  function injectMaximizeAgent() {
    injectMainWorld(function() {
      if (window.__IPM_maximizer) return;
      window.__IPM_maximizer = true;

      const SEL = "#janela_16028_102_1 > div.area_total_janela > header > aside > span:nth-child(2) > input";
      let pending = false;

      window.addEventListener('message', (e) => {
        if (e.data?.type === 'MAXIMIZE_NOW') {
          pending = true;
          let tries = 0;
          const iv = setInterval(() => {
            tries++;
            const btn = document.querySelector(SEL);
            if (btn && btn.offsetWidth > 0) {
              btn.click();
              console.log('[IPM] ✅ Maximizado! (main world)');
              pending = false;
              clearInterval(iv);
            } else if (tries >= 30) {
              clearInterval(iv);
              console.warn('[IPM] ⚠️ Botão não encontrado após', tries, 'tentativas');
            }
          }, 400);
        }
      });

      // MutationObserver
      const obs = new MutationObserver((mutations) => {
        if (!pending) return;
        for (const m of mutations) {
          for (const n of m.addedNodes) {
            if (n.nodeType === 1 && (n.id?.startsWith?.('janela_') || n.querySelector?.('[id^="janela_"]'))) {
              console.log('[IPM] 🔍 Janela detectada!');
              const btn = document.querySelector(SEL);
              if (btn && btn.offsetWidth > 0) {
                btn.click();
                console.log('[IPM] ✅ Maximizado na detecção!');
                pending = false;
                return;
              }
            }
          }
        }
      });
      if (document.body) obs.observe(document.body, { childList: true, subtree: true });
      console.log('[IPM] 👀 Main world pronto!');
    });
  }

  // ─── Detecta clique ───
  document.addEventListener('click', (event) => {
    try {
      const trigger = event.target.closest(
        '.botao-acao-base.fa-plus, .fa-plus.botao-acao-base, ' +
        '.div_botao_acao_button.fa-plus'
      );
      if (!trigger) return;
      console.log('[IPM] ⚡ Novo Processo clicado!');
      window.postMessage({ type: 'MAXIMIZE_NOW' }, '*');
    } catch (e) {}
  }, true);

  // ─── Init ───
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectMaximizeAgent);
  } else {
    injectMaximizeAgent();
  }
  console.log('[IPM] ✅ Agente injetado!');
})();
