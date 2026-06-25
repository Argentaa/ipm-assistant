// ============================================================
// IPM Overlay Assistant — Content Script
// Detecta triggers com seletores robustos + MutationObserver
// Overlay via Shadow DOM + iframe (pronto pra usar)
// ============================================================

(function () {
  'use strict';

  // ============================================================
  // CONFIG — Seletores robustos (baseados nas classes reais)
  // ============================================================

  // VÁRIAS estratégias de selector, em ordem de preferência
  const TRIGGER_SELECTORS = [
    // 1. Classe botao-acao-base + ícone fa-plus (o que vc copiou)
    'span.botao-acao-base.fa-plus',
    'span.fa-plus.botao-acao-base',
    '.botao-acao-base.fa-plus',

    // 2. Qualquer elemento com fa-plus dentro de area-acoes
    '.area-acoes .fa-plus',

    // 3. Pelo texto "Novo Processo"
    'button:has-text("Novo Processo")',

    // 4. Qualquer elemento que contenha "novo-processo" no href ou data
    '[href*="novo-processo"], [href*="novo_processo"], [data-acao*="novo"]',

    // 5. Fallback: qualquer span com fa-plus (último recurso)
    'span.fa-plus[class*="botao"]',
  ];

  // ATENÇÃO: CSS :has-text() não é nativo — vou usar filter() no código

  // ============================================================
  // 1. TRIGGER — DETECÇÃO DE CLIQUE ROBUSTA
  // ============================================================

  function isTriggerElement(el) {
    if (!el || !el.closest) return false;

    // Estratégia A: verifica se o elemento ou ancestral tem as classes certas
    const trigger = el.closest('.botao-acao-base, .fa-plus, .area-acoes');
    if (!trigger) return false;

    // Verifica se tem fa-plus (ícone de adicionar)
    if (trigger.classList.contains('fa-plus')) return true;

    // Verifica se tem classe botao-acao
    if (trigger.classList.contains('botao-acao-base') ||
        trigger.classList.contains('botao-acao-as-button')) return true;

    // Verifica se está dentro de .area-acoes
    if (trigger.closest('.area-acoes')) return true;

    return false;
  }

  function getTriggerContext(el) {
    const trigger = el.closest('.botao-acao-base, .fa-plus, .area-acoes') || el;
    return {
      tag: trigger.tagName,
      classes: Array.from(trigger.classList).join('.'),
      text: trigger.textContent?.trim()?.substring(0, 80) || '',
      id: trigger.id || ''
    };
  }

  // ============================================================
  // 2. CLICK DELEGATION (event capture phase)
  // ============================================================

  function setupTriggerDetection() {
    document.addEventListener('click', (event) => {
      try {
        if (!isTriggerElement(event.target)) return;

        const context = getTriggerContext(event.target);
        console.log('[IPM] ⚡ Trigger detectado!', context);

        // NÃO usar preventDefault() — deixa o IPM abrir a janela normalmente
        chrome.runtime.sendMessage({ type: 'TRIGGER_CLICKED' })
          .then(() => console.log('[IPM] ✅ Trigger enviado ao background'))
          .catch(() => { /* background pode não estar pronto */ });

      } catch (e) {
        if (location.hostname.includes('atende.net')) {
          console.warn('[IPM] ⚠️ Erro no trigger:', e.message);
        }
      }
    }, true); // capture phase = intercepta ANTES do site
  }

  // ============================================================
  // 3. MUTATION OBSERVER — detecta elementos que surgem depois
  //    (essencial pra SPA — o conteúdo carrega dinâmico)
  // ============================================================

  function setupMutationObserver() {
    let injectionDone = false;

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;

          // Verifica se o novo nó é nosso trigger
          if (isTriggerElement(node)) {
            console.log('[IPM] 🔍 Elemento trigger detectado via MutationObserver');
            highlightTrigger(node);
          }

          // Verifica filhos
          if (node.querySelectorAll) {
            const found = node.querySelectorAll(
              '.botao-acao-base.fa-plus, .fa-plus.botao-acao-base, .area-acoes .fa-plus'
            );
            for (const el of found) {
              console.log('[IPM] 🔍 Trigger filho detectado via MutationObserver');
              highlightTrigger(el);
            }
          }

          // Detecta quando o overlay de "Gerenciamento" carrega
          if (node.textContent?.includes('Gerenciamento') &&
              node.textContent?.includes('Processo')) {
            console.log('[IPM] 📋 Tela de Gerenciamento detectada');
          }
        }
      }
    });

    if (document.body) {
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        observer.observe(document.body, {
          childList: true,
          subtree: true
        });
      });
    }
  }

  function highlightTrigger(el) {
    // Adiciona um destaque sutil pra saber que a extensão reconheceu
    el.style.outline = '2px solid #1a73e8';
    el.style.outlineOffset = '2px';
    el.title = 'IPM Assistant: clique para novo processo';
  }

  // ============================================================
  // 4. OVERLAY ARCHITECTURE (Shadow DOM + iframe)
  //    Mantido do código original — ative quando quiser
  // ============================================================

  function setupOverlay() {
    if (document.getElementById('ipm-overlay-host')) return;

    const host = document.createElement('div');
    host.id = 'ipm-overlay-host';
    host.style.cssText = 'all: initial; display: block; position: fixed; z-index: 2147483647; top: 0; left: 0; width: 0; height: 0;';

    const shadow = host.attachShadow({ mode: 'closed' });

    const styleLink = document.createElement('link');
    styleLink.rel = 'stylesheet';
    styleLink.href = chrome.runtime.getURL('styles/overlay.css');
    shadow.appendChild(styleLink);

    const container = document.createElement('div');
    container.id = 'ipm-overlay';
    container.className = 'ipm-overlay-hidden';
    container.innerHTML = `
      <div class="ipm-overlay-backdrop" id="ipm-backdrop"></div>
      <div class="ipm-overlay-panel">
        <div class="ipm-overlay-header">
          <span class="ipm-overlay-title">IPM Assistant</span>
          <button class="ipm-overlay-close" id="ipm-close-btn">&times;</button>
        </div>
        <div class="ipm-overlay-body">
          <iframe
            id="ipm-iframe"
            src="${chrome.runtime.getURL('overlay.html')}"
            frameborder="0"
            sandbox="allow-scripts allow-same-origin allow-forms"
            style="width: 100%; height: 100%; border: none;"
          ></iframe>
        </div>
        <div class="ipm-overlay-footer">
          <span>IPM Overlay Assistant v1.0</span>
        </div>
      </div>
    `;

    shadow.appendChild(container);
    document.body.appendChild(host);

    const closeBtn = container.querySelector('#ipm-close-btn');
    const backdrop = container.querySelector('#ipm-backdrop');
    const iframe = container.querySelector('#ipm-iframe');

    function showOverlay(context) {
      container.className = 'ipm-overlay-visible';
      document.body.style.overflow = 'hidden';
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({
          type: 'OVERLAY_SHOWN',
          payload: context || null
        }, '*');
      }
    }

    function hideOverlay() {
      container.className = 'ipm-overlay-hidden';
      document.body.style.overflow = '';
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({ type: 'OVERLAY_HIDDEN' }, '*');
      }
    }

    closeBtn.addEventListener('click', hideOverlay);
    backdrop.addEventListener('click', hideOverlay);

    // postMessage bridge: iframe ↔ content script
    window.addEventListener('message', (event) => {
      if (!event.data?.type) return;
      const msg = event.data;

      switch (msg.type) {
        case 'OVERLAY_ACTION':
          executeHostPageAction(msg.action, msg.params)
            .then(result => {
              if (event.source) {
                event.source.postMessage({
                  type: 'ACTION_RESULT',
                  actionId: msg.actionId,
                  result
                }, '*');
              }
            });
          break;
        case 'OVERLAY_CLOSE':
          hideOverlay();
          break;
        case 'REQUEST_PAGE_DATA':
          const pageData = gatherPageData();
          if (event.source) {
            event.source.postMessage({ type: 'PAGE_DATA', payload: pageData }, '*');
          }
          break;
      }
    });

    // Escuta comandos do background/popup
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      switch (message.type) {
        case 'SHOW_OVERLAY':
          showOverlay(message.context);
          sendResponse({ success: true });
          break;
        case 'HIDE_OVERLAY':
          hideOverlay();
          sendResponse({ success: true });
          break;
        case 'TOGGLE_OVERLAY':
          if (container.className === 'ipm-overlay-visible') {
            hideOverlay();
          } else {
            showOverlay(message.context);
          }
          sendResponse({ success: true });
          break;
      }
      return true;
    });

    window.__ipmOverlay = { show: showOverlay, hide: hideOverlay };
  }

  // ============================================================
  // 5. HOST PAGE INTERACTION (preencher, clicar, etc.)
  // ============================================================

  async function executeHostPageAction(action, params) {
    switch (action) {
      case 'fillField':
        return fillField(params.selector, params.value);
      case 'clickElement':
        return clickElement(params.selector);
      case 'setSelectOption':
        return setSelectOption(params.selector, params.value);
      case 'submitForm':
        return submitForm(params.selector);
      default:
        return { success: false, error: `Ação desconhecida: ${action}` };
    }
  }

  function fillField(selector, value) {
    const el = document.querySelector(selector);
    if (!el) return { success: false, error: `Elemento não encontrado: ${selector}` };

    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype, 'value'
    )?.set;
    if (nativeInputValueSetter) {
      nativeInputValueSetter.call(el, value);
    } else {
      el.value = value;
    }
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new Event('blur', { bubbles: true }));
    return { success: true, element: el.tagName, value };
  }

  function clickElement(selector) {
    const el = document.querySelector(selector);
    if (!el) return { success: false, error: `Elemento não encontrado: ${selector}` };
    el.click();
    return { success: true, element: el.tagName };
  }

  function setSelectOption(selector, value) {
    const el = document.querySelector(selector);
    if (!el || el.tagName !== 'SELECT') {
      return { success: false, error: 'Select não encontrado' };
    }
    for (const option of el.options) {
      if (option.value === value || option.text === value) {
        el.value = option.value;
        el.dispatchEvent(new Event('change', { bubbles: true }));
        return { success: true, selectedValue: option.value, selectedText: option.text };
      }
    }
    return { success: false, error: `Opção "${value}" não encontrada` };
  }

  function submitForm(selector) {
    const form = selector ? document.querySelector(selector) : document.querySelector('form');
    if (!form) return { success: false, error: 'Form não encontrado' };
    form.submit();
    return { success: true };
  }

  function gatherPageData() {
    return {
      title: document.title,
      url: location.href,
      hostname: location.hostname
    };
  }

  // ============================================================
  // INICIALIZAÇÃO
  // ============================================================

  function init() {
    if (!location.hostname.includes('atende.net')) return;

    console.log('[IPM] 🚀 Content Script v2 iniciado');

    // 1. Trigger de clique com seletores por classe
    setupTriggerDetection();

    // 2. MutationObserver para SPA (conteúdo dinâmico)
    setupMutationObserver();

    // 3. Overlay (descomentar quando quiser ativar)
    // setupOverlay();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
