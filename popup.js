// ============================================================
// IPM Overlay Assistant — Popup Logic
// ============================================================

(function () {
  'use strict';

  const statusIndicator = document.getElementById('status-indicator');
  const triggerStatus = document.getElementById('trigger-status');
  const currentUrl = document.getElementById('current-url');
  const btnToggleOverlay = document.getElementById('btn-toggle-overlay');
  const btnRefresh = document.getElementById('btn-refresh');

  // ─── Atualiza status ───
  async function refreshStatus() {
    try {
      // Tenta mandar mensagem pro content script da aba ativa
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (tab && tab.url) {
        currentUrl.textContent = tab.url.length > 40 ? tab.url.substring(0, 37) + '...' : tab.url;

        if (tab.url.includes('atende.net')) {
          statusIndicator.className = 'indicator active';
        } else {
          statusIndicator.className = 'indicator inactive';
        }
      }

      // Pega status do background
      const bgStatus = await chrome.runtime.sendMessage({ type: 'GET_STATUS' });
      if (bgStatus && bgStatus.triggerActive) {
        triggerStatus.textContent = `Ativo (${Math.round(bgStatus.triggerAge / 1000)}s atrás)`;
        triggerStatus.className = 'value yes';
      } else {
        triggerStatus.textContent = 'Nenhum';
        triggerStatus.className = 'value no';
      }
    } catch (e) {
      // Background pode não responder se estiver recarregando
      console.log('[IPM Popup]', e.message);
    }
  }

  // ─── Alterna overlay ───
  async function toggleOverlay() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) return;

      await chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_OVERLAY' });
      // Fecha o popup depois de alternar
      window.close();
    } catch (e) {
      console.warn('[IPM Popup] Erro ao alternar overlay:', e.message);
    }
  }

  // ─── Events ───
  btnToggleOverlay.addEventListener('click', toggleOverlay);
  btnRefresh.addEventListener('click', refreshStatus);

  // ─── Init ───
  document.addEventListener('DOMContentLoaded', refreshStatus);
})();
