// ============================================================
// maximize.js — Roda no MAIN WORLD via scripting.executeScript
// Tem acesso completo ao jQuery e APIs do IPM
// ============================================================

(function () {
  'use strict';

  const SEL = "#janela_16028_102_1 > div.area_total_janela > header > aside > span:nth-child(2) > input";

  console.log('[IPM] 🚀 maximize.js executado no main world');

  // Tenta imediatamente
  function maximizar() {
    try {
      const btn = document.querySelector(SEL);
      if (btn && btn.offsetWidth > 0 && btn.offsetHeight > 0) {
        btn.click();
        console.log('[IPM] ✅ Maximizado!');
        return true;
      }
      return false;
    } catch (e) {
      console.error('[IPM] ❌', e);
      return false;
    }
  }

  // Tenta agora
  if (maximizar()) return;

  // Retenta por 12s
  let tries = 0;
  const iv = setInterval(() => {
    tries++;
    if (maximizar() || tries >= 24) {
      clearInterval(iv);
      if (tries >= 24) console.warn('[IPM] ⚠️ Falhou após 24 tentativas');
    }
  }, 500);
})();
