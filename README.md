# IPM Overlay Assistant — Extensão Chrome

Extensão Manifest V3 que automatiza janelas no **IPM Sistemas (Atende.net)**.

## Funcionalidades

### ✅ Auto-Maximize (ativa)
Quando você clica no botão de abrir novo processo na URL `https://seberi.atende.net/atende.php?rot=1&aca=1#!/sistema/16`, a extensão automaticamente:

1. **Detecta o clique** no elemento trigger (via XPath)
2. **Vigia** novas janelas/abas que abrirem nos próximos 10 segundos
3. **Maximiza** a janela filha clicando no botão maximizar automaticamente

### 🧩 Overlay (pronto, desativado por padrão)
Arquitetura completa de overlay usando **Shadow DOM (closed) + iframe** para total isolamento:
- **Shadow DOM** — CSS do site IPM não contamina seu overlay
- **Iframe** — isolamento JS + CSS completo (carregado da origem da extensão)
- **postMessage bridge** — comunicação segura entre iframe ↔ página

Para ativar o overlay, descomente a linha `// setupOverlay();` no `content-script.js`.

### 🎛️ Popup na Toolbar
Controle rápido: alternar overlay, ver status do trigger e URL atual.

## Estrutura

```
ipm-extension/
├── manifest.json           # MV3 com permissões para *.atende.net
├── background.js           # Service worker: detecta janelas, injeta maximize
├── content-script.js       # Trigger + overlay Shadow DOM + interação host
├── overlay.html            # UI do overlay (carregado no iframe)
├── overlay.js              # Lógica do overlay
├── popup.html              # Popup da toolbar
├── popup.js                # Lógica do popup
├── styles/
│   └── overlay.css         # Estilos escopados ao Shadow DOM
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## Como instalar (modo desenvolvedor)

1. Abra `chrome://extensions`
2. Ative **"Modo do desenvolvedor"** (canto superior direito)
3. Clique em **"Carregar sem compactação"**
4. Selecione a pasta `/workspace/ipm-extension`
5. Pronto! A extensão aparece na toolbar

## Como testar

1. Faça login no IPM e vá até a tela de **Gerenciamento de Processo Digital**
2. Clique no botão **"Novo Processo"** (ícone ➕)
3. ✅ Uma nova janela vai abrir e a extensão vai **maximizar automaticamente via Chrome API**

## Debug

- **Console da página** (F12 → Console): mensagens com prefixo `[IPM]` aparecem no DevTools
- **Service Worker**: em `chrome://extensions`, clique em "Service Worker" no card da extensão
- **Trigger**: clique no "Novo Processo" e veja se aparece `[IPM] ⚡ Trigger detectado!`
- Se não aparecer nada, o seletor pode não estar encontrando o elemento

## Seletores usados para detectar o trigger

O content script usa **múltiplas estratégias** em cascata:

| Estratégia | Seletor |
|---|---|
| Classe + ícone | `span.botao-acao-base.fa-plus` |
| Classe fallback | `.botao-acao-base.fa-plus` |
| Área de ações | `.area-acoes .fa-plus` |
| MutationObserver | Detecta elementos que surgem dinamicamente (SPA) |

### Para personalizar
Edite o array `TRIGGER_SELECTORS` no início do `content-script.js`.

## Maximize — Agora usa Chrome API pura

Em vez de tentar achar o botão maximizar no DOM (instável), o background agora usa:

```js
chrome.windows.update(windowId, { state: 'maximized' });
```

Isso funciona em **qualquer janela**, em **qualquer site**, sem depender de XPath.

## Fluxo completo

```
1. Você clica no botão "Novo Processo" (ícone ➕)
2. content-script.js detecta o clique via classes CSS (.fa-plus.botao-acao-base)
   → envia mensagem TRIGGER_CLICKED para o background
3. background.js ativa estado de trigger por 12 segundos
4. IPM abre uma nova janela (popup)
5. background.js detecta via chrome.windows.onCreated
6. ✅ chrome.windows.update(windowId, { state: 'maximized' })
   → janela maximizada sem precisar de seletor nenhum!
```
