// ============================================================
// IPM Maxmize — Pesquisa e Solução Bulletproof
// ============================================================
//
// 📁 Arquivos analisados:
//   - sistema_sync_5d67ad84f141d25596d09f786ba206dd.js  (452 KB)
//   - telas_sync_20c2fae373cc14cec86b8969e6a0e168.js     (134 KB)
//   - Fonte: https://seberi.atende.net/static/bundle/...
//
// 🔍 RESULTADOS DA PESQUISA
// ============================================================
//
// 1. $.fn.IPMJanela — jQuery Plugin (sistema_sync.js, ~line 379)
//    ───────────────────────────────────────
//    Assinatura: $.fn.IPMJanela = function(options)
//    Opções relevantes:
//      maximizavel: false   ← botão de maximizar visível?
//      maximizada: false    ← já abre maximizada?
//      redimensionavel: false
//      altura/alturaMin/alturaMax
//      largura/larguraMin/larguraMax
//      draggable: true
//      centralizada: true
//
//    Uso: $('<div>').IPMJanela({...}) ou via class Janela
//
// 2. $.fn.maximizarJanela(toggle) — MÉTODO DE MAXIMIZAR (PRINCIPAL)
//    ──────────────────────────────────────────────────────────────
//    Assinatura: $.fn.maximizarJanela = function(a) { ... }
//      a === true  → maximize
//      a === false → restore
//      undefined  → toggle
//
//    Implementation summary:
//      - Sets e.maximizada = a (boolean)
//      - If maximizing:
//        • Disables draggable
//        • Calls maximizaJanela(this) (global function)
//        • Saves current size/pos in this[0].max = [w,h,top,left]
//        • Hides resizable handles
//        • Updates maximize button to "restore"
//      - If restoring:
//        • Enables draggable
//        • Restores saved size/pos from this[0].max
//        • Removes class "janela_maximizada"
//        • Calls ajustaConteudoJanela()
//
// 3. $.fn.isMaximizada() — VERIFICA SE ESTÁ MAXIMIZADA
//    ─────────────────────────────────────────────────
//    return this.is('.janela_maximizada')
//    (checks for CSS class "janela_maximizada")
//
// 4. function maximizaJanela(t, r) — FUNÇÃO GLOBAL DE MAXIMIZE
//    ──────────────────────────────────────────────────────────
//    Args: t = element, r = restore? (optional)
//    
//    For Layout V3 (current):
//      container = ControleElementosSistema.buscaElementoContainerJanelas()
//      If r === true → width:100%, height:100%
//      Else → width = container.width - 2, height = container.height - 2
//      Position: top:0, left:0
//      If parent is #root_bloqueadora, use container offset
//      Adds class "janela_maximizada"
//      Calls ajustaConteudoJanela()
//
//    For older layouts:
//      container = .estrutura_menu_conteudo_janela (or parent)
//      Same logic but measures from that container
//
// 5. TransacaoEstiloCss — SISTEMA DE CSS TRANSACIONAL
//    ──────────────────────────────────────────────────
//    IPM não usa CSS direto — usa um sistema de transação:
//      TransacaoEstiloCss.iniciaTransacao()
//      TransacaoEstiloCss.css(element, prop, value)
//      TransacaoEstiloCss.finalizaTransacao()  // applies batch
//    
//    Isso significa que style.setProperty('...','...','important')
//    em content script é INEFICAZ — o IPM reaplica seus estilos
//    via flush() depois, sobrescrevendo tudo.
//
// 6. Botão Maximizar na UI
//    ─────────────────────
//    Botão é criado por: criaBotaoMaximizarDivSuperiorNormal()
//    Usa class "acao-controle-janela" e "janela_gadget_ajuda"
//    Dispara: this.getObj().getJanela().maximizarJanela()
//
// 7. toggleFullScreen() — NÃO É IPM
//    ──────────────────────────────
//    É o Fullscreen API do navegador (document.documentElement.requestFullscreen)
//    Não tem relação com as janelas internas do IPM.
//
// 💡 RECOMENDAÇÕES
// ============================================================
//
// ✅ PRIMEIRA OPÇÃO (recomendada): Usar a API nativa do IPM
//    ─────────────────────────────────────────────────────
//    $('#janela_XXXXX').maximizarJanela(true);
//    // ou: window.maximizaJanela(document.getElementById('janela_XXXXX'))
//    
//    Vantagens:
//    - O IPM gerencia todo o CSS (via TransacaoEstiloCss)
//    - Não é sobrescrito pelo sistema
//    - Dispara todos os callbacks corretamente
//    - Mantém a classe janela_maximizada que o IPM reconhece
//
// ✅ SEGUNDA OPÇÃO: Override do TransacaoEstiloCss
//    ──────────────────────────────────────────────
//    Se o sistema tentar desmaximizar a janela, intercepte:
//    
//    TransacaoEstiloCss.css = function(target, prop, value) {
//      if ($(target).is('#janela_PROTEGIDA') && 
//          ['width','height','top','left'].includes(prop)) {
//        return; // bloqueia a alteração
//      }
//      return originalCss(target, prop, value);
//    };
//
// ✅ TERCEIRA OPÇÃO: MutationObserver persistente
//    ────────────────────────────────────────────
//    Observa mudanças de atributo/style na janela e reaplica:
//    
//    const mo = new MutationObserver(() => {
//      $('#janela_XXXXX').maximizarJanela(true);
//    });
//    mo.observe(janela, { attributes: true, attributeFilter: ['style', 'class'] });
//
// ⚠️ O QUE NÃO FUNCIONA
// ============================================================
// ❌ style.setProperty('width', '100%', 'important')
//    → IPM sobrescreve via TransacaoEstiloCss.flush()
//
// ❌ janela.style.width = '100%'
//    → Mesmo problema
//
// ❌ CSS !important injection via <style> tag
//    → IPM usa style inline com JS, CSS não prevalece
//
// ============================================================
// CÓDIGO COMPLETO DA SOLUÇÃO
// ============================================================

(function() {
  'use strict';

  /**
   * MAXIMIZE via IPM native API
   * Call this when you want to maximize a janela element.
   * 
   * @param {Element|string} janelaOrId - The div#janela_XXXXX element or its ID
   * @returns {boolean} - true if maximized successfully
   */
  function ipmMaximize(janelaOrId) {
    const janela = typeof janelaOrId === 'string'
      ? document.getElementById(janelaOrId)
      : janelaOrId;

    if (!janela) return false;

    const $j = window.jQuery && jQuery(janela);

    // --- Strategy 1: jQuery plugin method (most reliable) ---
    if ($j && typeof $j.maximizarJanela === 'function') {
      $j.maximizarJanela(true);
      return true;
    }

    // --- Strategy 2: Global function ---
    if (typeof window.maximizaJanela === 'function') {
      window.maximizaJanela(janela);
      return true;
    }

    // --- Strategy 3: Janela class instance ---
    if (janela.myInstance && typeof janela.myInstance.maximizarJanela === 'function') {
      janela.myInstance.maximizarJanela();
      return true;
    }

    // --- Strategy 4: Via getOptions + TransacaoEstiloCss ---
    if ($j && typeof $j.getOptions === 'function') {
      const opts = $j.getOptions();
      if (opts) {
        opts.maximizada = true;
        if (typeof $j.maximizarJanela === 'function') {
          $j.maximizarJanela(true);
          return true;
        }
      }
    }

    return false;
  }

  /**
   * ENABLE BULLETPROOF MODE
   * Patches TransacaoEstiloCss.css to prevent the IPM from
   * overriding our maximized window's position/size.
   * 
   * @param {string} janelaId - The ID of the window to protect
   */
  function protectMaximizedWindow(janelaId) {
    if (!window.TransacaoEstiloCss) {
      console.warn('[IPM] TransacaoEstiloCss not available yet');
      return false;
    }

    if (TransacaoEstiloCss.__patched) return true;

    const originalCss = TransacaoEstiloCss.css.bind(TransacaoEstiloCss);
    let protectedId = janelaId;

    TransacaoEstiloCss.css = function(target, prop, value) {
      const $target = window.jQuery ? jQuery(target) : null;
      const targetId = $target ? $target.attr('id') : (target.id || null);

      if (targetId === protectedId) {
        // Allow transition cleanup only
        if (prop === 'transition' && value === '') {
          return originalCss(target, prop, value);
        }

        // Block size/position changes
        const BLOCKED = ['width', 'height', 'top', 'left', 'position'];
        if (typeof prop === 'object') {
          const hasBlocked = Object.keys(prop).some(k => BLOCKED.includes(k));
          if (hasBlocked) return;
        } else if (BLOCKED.includes(prop)) {
          return;
        }
      }

      return originalCss(target, prop, value);
    };

    TransacaoEstiloCss.__patched = true;
    TransacaoEstiloCss.__unpatch = function() {
      TransacaoEstiloCss.css = originalCss;
      delete TransacaoEstiloCss.__patched;
    };

    return true;
  }

  /**
   * WATCH for new windows and maximize them automatically
   */
  function watchAndMaximize() {
    let pending = false;

    // Set up trigger detection
    document.addEventListener('click', (e) => {
      const btn = e.target.closest(
        '.fa-plus.botao-acao-base, .botao-acao-base.fa-plus, ' +
        '[class*="Novo Processo"], .div_botao_acao_button.fa-plus'
      );
      if (btn) {
        pending = true;
        console.log('[IPM] ⚡ Trigger detected, will maximize next window');
      }
    }, true);

    // Watch for new windows
    const observer = new MutationObserver(() => {
      if (!pending) return;
      
      document.querySelectorAll('[id^="janela_"]:not([data-ipm-maximized])').forEach(j => {
        if (j.offsetWidth > 0) {
          if (ipmMaximize(j)) {
            j.setAttribute('data-ipm-maximized', 'true');
            protectMaximizedWindow(j.id);
            pending = false;
            console.log(`[IPM] ✅ ${j.id} maximized and protected`);
          }
        }
      });
    });

    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true
    });

    console.log('[IPM] 👀 Watching for new windows...');
    console.log('[IPM] 💡 Usage: ipmMaximize(document.getElementById("janela_XXXXX"))');
  }

  // Auto-start if running in IPM context
  if (typeof jQuery !== 'undefined' && location.hostname.includes('atende.net')) {
    watchAndMaximize();
  }

  // Export utilities
  window.__ipmMaximize = ipmMaximize;
  window.__ipmProtect = protectMaximizedWindow;
  window.__ipmMaximizeAll = function() {
    document.querySelectorAll('[id^="janela_"]').forEach(j => {
      ipmMaximize(j) && j.setAttribute('data-ipm-maximized', 'true');
    });
  };

})();
