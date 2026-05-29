# Quick Save - Bookmarklet & Chrome Extension

Sistema completo para salvar links rapidamente no only.link.

## 📌 Bookmarklet

### Acesso
- Página de instalação: https://onlylinks.id/bookmarklet
- Basta arrastar o botão para a barra de favoritos

### Como funciona
```javascript
// O bookmarklet abre um popup com:
- URL da página atual
- Título da página
- Texto selecionado (como descrição)
- Campos para tags e visibilidade
```

### Vantagens
✅ Funciona em qualquer navegador
✅ Não requer instalação
✅ Simples de usar
✅ Captura texto selecionado

## 🔌 Chrome Extension

### Estrutura
```
chrome-extension/
├── manifest.json      # Configuração (Manifest V3)
├── popup.html         # Interface do popup
├── popup.js           # Lógica do popup
├── background.js      # Service worker
├── icons/             # Ícones da extensão
└── README.md          # Documentação
```

### Funcionalidades
- ✅ One-click save
- ✅ Captura automática de título/URL
- ✅ Captura texto selecionado
- ✅ Tags inline
- ✅ Public/Private toggle
- ✅ Context menu integration
- ✅ Keyboard shortcut support

### Instalação Manual
1. Baixar código do GitHub
2. Chrome → `chrome://extensions/`
3. Ativar "Developer mode"
4. "Load unpacked" → selecionar pasta `chrome-extension`

### Publicação (Futuro)
Para publicar na Chrome Web Store:
1. Criar conta de desenvolvedor ($5 one-time)
2. Adicionar ícones nas 4 resoluções
3. Adicionar screenshots
4. Submeter para revisão

## 🔐 Autenticação

Ambas as soluções verificam autenticação via:
```javascript
fetch('/api/auth/me', { credentials: 'include' })
```

Se não autenticado:
- Bookmarklet: mostra prompt para login
- Extension: redireciona para /app

## 🚀 Endpoints Usados

### GET `/api/bookmarklet`
Serve o popup HTML do bookmarklet

### POST `/api/bookmarks`
Salva o bookmark (usado por ambos)

```json
{
  "url": "https://example.com",
  "title": "Page Title",
  "description": "Selected text or custom description",
  "tags": ["tag1", "tag2"],
  "is_public": true
}
```

## 💡 Como Usar

### Bookmarklet
1. Ir para https://onlylinks.id/bookmarklet
2. Arrastar "+ only.link" para barra de favoritos
3. Navegar para qualquer página
4. Clicar no bookmarklet
5. Popup abre → ajustar dados → salvar

### Extension
1. Instalar extensão (manual ou da Web Store)
2. Navegar para qualquer página
3. Clicar no ícone da extensão
4. Ajustar dados → salvar

## 🎨 Próximas Melhorias

### Bookmarklet
- [ ] Suporte offline (service worker)
- [ ] Auto-complete de tags
- [ ] Preview de OG image

### Extension
- [ ] Atalho de teclado customizável
- [ ] Badge com contador de saves
- [ ] Quick add (sem abrir popup)
- [ ] Histórico de salvamentos
- [ ] Sync entre dispositivos
- [ ] Publicar na Chrome Web Store

## 📊 Tracking

Ambas as páginas incluem Google Analytics:
- `/bookmarklet` - Página de instruções
- `/api/bookmarklet` - Popup de save
- `/extension` - Página da extensão

## 🔧 Manutenção

### Atualizar Bookmarklet
1. Editar código JavaScript inline em `bookmarklet.html`
2. Usuários precisam re-adicionar o bookmarklet

### Atualizar Extension
1. Editar arquivos em `chrome-extension/`
2. Incrementar `version` no `manifest.json`
3. Publicar nova versão na Web Store
4. Auto-update para usuários instalados

## 📝 Notas Técnicas

### CORS
Extension precisa de `host_permissions` para `https://onlylinks.id/*`

### CSP (Content Security Policy)
Bookmarklet funciona via `javascript:` protocol
Extension usa CSP rigoroso no manifest

### Cookies
Ambos dependem de cookies httpOnly para autenticação
Requer `credentials: 'include'` nos fetch requests

## 🎯 Testes

### Testar Bookmarklet
```bash
# Iniciar servidor local
npm start

# Acessar
open http://localhost:3000/bookmarklet

# Testar em diferentes páginas
```

### Testar Extension
```bash
# Load unpacked em chrome://extensions/
# Testar em:
- Páginas HTTP/HTTPS
- Páginas com texto selecionado
- Páginas de erro
- Com/sem autenticação
```

## 📚 Documentação

- `/bookmarklet` - Instruções para usuários (bookmarklet)
- `/extension` - Instruções para usuários (extension)
- `/chrome-extension/README.md` - Docs técnicos da extensão

---

**Status:** ✅ Implementado e funcionando
**Próximo passo:** Criar ícones e publicar extensão na Chrome Web Store
