// ============================================================
// IPM Overlay Assistant — Content Script v8
// Injeta script no MAIN WORLD para acessar API nativa do IPM
// ============================================================
// O content script roda em "isolated world" — NÃO tem acesso
// ao jQuery da página nem às funções do IPM (maximizarJanela,
// TransacaoEstiloCss, etc.). Por isso usamos injeção de
// <script> para executar código no contexto da página.
// ============================================================

(function () {
  'use strict';

  if (!location.hostname.includes('atende.net')) return;

  console.log('[IPM] 🚀 Content Script v8 - Main World injection');

  // ============================================================
  // 1. INJETA CÓDIGO NO MAIN WORLD (contexto da página)
  // ============================================================
  // O código dentro de injectMainWorld(fn) roda COMO SE estivesse
  // no console da página — tem acesso a $, TransacaoEstiloCss,
  // maximizaJanela, etc.
  // ============================================================
  function injectMainWorld(code) {
    const script = document.createElement('script');
    script.textContent = `(${code})();`;
    document.documentElement.appendChild(script);
    script.remove();
  }

  // ============================================================
  // 2. INJETA O CÓDIGO DE MAXIMIZE NA PÁGINA
  // ============================================================
  // Este código roda no contexto da página (main world)
  // ============================================================
  function injectMaximizeAgent() {
    injectMainWorld(function maximizeAgent() {
      // ⚠️ ESTE CÓDIGO RODA NO CONTEXTO DA PÁGINA (main world)
      // Tem acesso a $, jQuery, TransacaoEstiloCss, maximizaJanela, etc.

      // Se já foi injetado antes, não duplica
      if (window.__IPM_maximizeAgent) return;
      window.__IPM_maximizeAgent = true;

      let maximizePending = false;

      // ─── Maximiza usando a API nativa do IPM ───
      function maximizeJanela(el) {
        if (!el || el.offsetWidth === 0) return false;

        try {
          const $j = $(el);
          const id = el.id;
          console.log(`[IPM] 🔧 Maximizando: ${id}`);

          // Strategy A: jQuery plugin method
          if (typeof $j.maximizarJanela === 'function') {
            $j.maximizarJanela(true);
            console.log(`[IPM] ✅ $.fn.maximizarJanela(true) funcionou!`);
            return true;
          }

          // Strategy B: Global function
          if (typeof window.maximizaJanela === 'function') {
            window.maximizaJanela(el);
            console.log(`[IPM] ✅ maximizaJanela() funcionou!`);
            return true;
          }

          // Strategy C: TransacaoEstiloCss diretamente
          if (window.TransacaoEstiloCss) {
            TransacaoEstiloCss.iniciaTransacao();
            TransacaoEstiloCss.css(el, {
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              'z-index': 9999
            });
            TransacaoEstiloCss.finalizaTransacao();
            $j.addClass('janela_maximizada');
            console.log(`[IPM] ✅ TransacaoEstiloCss direto funcionou!`);
            return true;
          }

          // Strategy D: jQuery css direto
          $j.css({
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            'z-index': 9999
          }).addClass('janela_maximizada');
          console.log(`[IPM] ✅ jQuery.css funcionou!`);
          return true;

        } catch (e) {
          console.error('[IPM] ❌ Erro:', e);
          return false;
        }
      }

      // ─── Tenta maximizar todas as janelas ───
      function tryMaximizeAll() {
        if (!maximizePending) return;
        const janelas = document.querySelectorAll('[id^="janela_"]');
        let ok = false;
        for (const j of janelas) {
          if (maximizeJanela(j)) ok = true;
        }
        if (ok) maximizePending = false;
        return ok;
      }

      // ─── MutationObserver para detectar novas janelas ───
      const observer = new MutationObserver((mutations) => {
        if (!maximizePending) return;
        for (const m of mutations) {
          for (const node of m.addedNodes) {
            if (node.nodeType !== Node.ELEMENT_NODE) continue;
            if (node.id?.startsWith?.('janela_') || node.querySelector?.('[id^="janela_"]')) {
              console.log('[IPM] 🔍 Janela detectada (main world)!');
              // Tenta varias vezes com delay
              let tries = 0;
              const iv = setInterval(() => {
                tries++;
                if (tryMaximizeAll() || tries >= 25) {
                  clearInterval(iv);
                  if (tries >= 25) console.warn('[IPM] ⚠️ Esgotado');
                }
              }, 400);
              return;
            }
          }
        }
      });

      // ─── Escuta comando vindo do content script ───
      window.addEventListener('message', (event) => {
        if (event.data?.type === 'IPM_MAXIMIZE') {
          maximizePending = true;
          tryMaximizeAll();
        }
      });

      // Inicia observer quando o DOM estiver pronto
      function startObserver() {
        if (document.body) {
          observer.observe(document.body, { childList: true, subtree: true });
          console.log('[IPM] 👀 Main world agent pronto!');
        } else {
          setTimeout(startObserver, 200);
        }
      }
      startObserver();
    });
  }

  // ============================================================
  // 3. TRIGGER — detecta clique e avisa o main world
  // ============================================================
  document.addEventListener('click', (event) => {
    try {
      const trigger = event.target.closest(
        '.botao-acao-base.fa-plus, .fa-plus.botao-acao-base, ' +
        '.div_botao_acao_button.fa-plus'
      );
      if (!trigger) return;
      console.log('[IPM] ⚡ Novo Processo clicado! Avisando main world...');
      // Envia mensagem para o código no main world
      window.postMessage({ type: 'IPM_MAXIMIZE' }, '*');
    } catch (e) {}
  }, true);

  // ============================================================
  // 4. INICIALIZA
  // ============================================================
  function init() {
    // Injeta o agente no main world (tem acesso ao jQuery do IPM)
    injectMaximizeAgent();
    console.log('[IPM] ✅ Agente main world injetado!');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
