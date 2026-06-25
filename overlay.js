// ============================================================
// IPM Overlay Assistant — Overlay UI Logic
// Executa dentro do iframe, comunicação via postMessage
// ============================================================

(function () {
  'use strict';

  // ─── Referências DOM ───
  const placeholderView = document.getElementById('placeholder-view');
  const pageUrlEl = document.getElementById('page-url');
  const logContainer = document.getElementById('log-container');
  const btnDados = document.getElementById('btn-dados');
  const btnFechar = document.getElementById('btn-fechar');

  // ─── Helpers ───
  function addLog(message, type = 'info') {
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.textContent = `▸ ${message}`;
    logContainer.appendChild(entry);
    logContainer.scrollTop = logContainer.scrollHeight;
  }

  // ─── Envia mensagem pro content script ───
  function sendToContent(type, data = {}) {
    window.parent.postMessage({
      type: type,
      ...data,
      actionId: Date.now() + '_' + Math.random().toString(36).slice(2, 8)
    }, '*');
  }

  // ─── Pede dados da página ───
  function requestPageData() {
    addLog('Solicitando dados da página...', 'info');
    sendToContent('REQUEST_PAGE_DATA');
  }

  // ─── Fecha o overlay ───
  function closeOverlay() {
    addLog('Fechando overlay...', 'info');
    sendToContent('OVERLAY_CLOSE');
  }

  // ─── Actions ───
  function performAction(action, params) {
    addLog(`Executando: ${action}`, 'info');
    sendToContent('OVERLAY_ACTION', { action, params });
  }

  // ─── Recebe mensagens do content script ───
  window.addEventListener('message', (event) => {
    const msg = event.data;
    if (!msg || !msg.type) return;

    switch (msg.type) {
      case 'OVERLAY_SHOWN':
        addLog('Overlay exibido', 'success');
        if (msg.payload) {
          addLog(`Contexto: ${JSON.stringify(msg.payload)}`, 'info');
        }
        // Pede dados da página automaticamente
        requestPageData();
        break;

      case 'OVERLAY_HIDDEN':
        addLog('Overlay ocultado', 'warn');
        break;

      case 'SET_CONTEXT':
        pageUrlEl.textContent = msg.payload?.url || 'N/A';
        addLog(`Contexto recebido: ${JSON.stringify(msg.payload)}`, 'success');
        break;

      case 'PAGE_DATA':
        if (msg.payload) {
          pageUrlEl.textContent = msg.payload.url || 'N/A';
          addLog(`Dados da página carregados: ${msg.payload.title}`, 'success');
        }
        break;

      case 'ACTION_RESULT':
        if (msg.result?.success) {
          addLog(`Ação concluída com sucesso`, 'success');
        } else {
          addLog(`Falha na ação: ${msg.result?.error}`, 'error');
        }
        break;
    }
  });

  // ─── Event Listeners ───
  btnDados.addEventListener('click', () => {
    requestPageData();
  });

  btnFechar.addEventListener('click', closeOverlay);

  // ─── Init ───
  addLog('Overlay UI pronta', 'success');
  addLog('Aguardando dados da página...', 'info');

  // Avisa ao content script que o iframe carregou
  window.parent.postMessage({ type: 'IFRAME_READY' }, '*');

})();
