// ============================================================
// IPM Overlay Assistant — Content Script v11
// Main world injection + delay de 3s para janela carregar
// ============================================================

(function () {
  'use strict';

  if (!location.hostname.includes('atende.net')) return;

  console.log('[IPM] 🚀 v11');

  // ─── SELETOR EXATO que funciona no console ───
  const SELECTOR = "#janela_16028_102_1 > div.area_total_janela > header > aside > span:nth-child(2) > input";

  // ─── Injeta código no main world (mesmo contexto do console) ───
  function injectMainWorld(code) {
    const s = document.createElement('script');
    s.textContent = `(${code})();`;
    document.documentElement.appendChild(s);
    s.remove();
  }

  // ─── Código que roda no contexto da página (main world) ───
  function injectPageAgent() {
    injectMainWorld(function() {
      if (window.__IPM_v11) return;
      window.__IPM_v11 = true;

      const SEL = "#janela_16028_102_1 > div.area_total_janela > header > aside > span:nth-child(2) > input";

      function maximizar() {
        try {
          const btn = document.querySelector(SEL);
          if (btn && btn.offsetWidth > 0 && btn.offsetHeight > 0) {
            console.log('[IPM] 🖱️ Clicando no maximize...');
            btn.click();
            console.log('[IPM] ✅ Maximizado!');
            return true;
          }
          return false;
        } catch(e) {
          console.error('[IPM] ❌', e);
          return false;
        }
      }

      // Escuta comando do content script
      window.addEventListener('message', (e) => {
        if (e.data?.type !== 'MAXIMIZE') return;

        console.log('[IPM] ⏱️ Aguardando 3s para janela carregar...');

        // Espera 3 segundos ANTES de tentar
        setTimeout(() => {
          if (maximizar()) return;

          // Se não achou, tenta por 10s
          let tries = 0;
          const iv = setInterval(() => {
            tries++;
            if (maximizar() || tries >= 20) {
              clearInterval(iv);
              if (tries >= 20) console.warn('[IPM] ⚠️ Falhou após 20 tentativas');
            }
          }, 500);
        }, 3000);
      });

      // MutationObserver (monitora mas com delay)
      const obs = new MutationObserver((mutations) => {
        for (const m of mutations) {
          for (const n of m.addedNodes) {
            if (n.nodeType !== 1) continue;
            if (n.id?.startsWith?.('janela_') || n.querySelector?.('[id^="janela_"]')) {
              // Apenas log, a ação vem via postMessage com delay
              console.log('[IPM] 🔍 Janela detectada no DOM');
              return;
            }
          }
        }
      });

      if (document.body) {
        obs.observe(document.body, { childList: true, subtree: true });
        console.log('[IPM] 👀 Agente v11 pronto!');
      }
    });
  }

  // ─── Detecta clique e envia comando com delay ───
  document.addEventListener('click', (event) => {
    try {
      const trigger = event.target.closest(
        '.botao-acao-base.fa-plus, .fa-plus.botao-acao-base, ' +
        '.div_botao_acao_button.fa-plus'
      );
      if (!trigger) return;
      console.log('[IPM] ⚡ Novo Processo clicado! Aguardando 3s...');
      window.postMessage({ type: 'MAXIMIZE' }, '*');
    } catch (e) {}
  }, true);

  // ─── Init ───
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectPageAgent);
  } else {
    injectPageAgent();
  }
})();
