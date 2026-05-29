# ID Mapping: app.js → index.html (Impeccable Redesign)

Este documento mapeia os IDs usados no `app.js` original para os IDs corretos no `index.html` redesenhado.

## ✅ Já Corrigidos

| app.js (antigo) | index.html (novo) | Status |
|---|---|---|
| `prev-page-btn` | `prev-btn` | ✅ Corrigido + null check |
| `next-page-btn` | `next-btn` | ✅ Corrigido + null check |
| `logo-home` | N/A | ✅ Null check adicionado |

## 🔴 Precisa Corrigir (Críticos - quebram funcionalidade)

| app.js (antigo) | index.html (novo) | Função |
|---|---|---|
| `add-bookmark-btn` | `new-bookmark-btn` | Abrir modal novo bookmark |
| `login-trigger-btn` | `login-btn` | Abrir modal login |
| `register-trigger-btn` | `register-btn` | Abrir modal registro |
| `auth-dialog` | `auth-modal` | Modal autenticação |
| `auth-close-btn` | `auth-modal-close` | Fechar modal auth |
| `auth-dialog-title` | `auth-modal-title` | Título do modal |
| `auth-submit-btn` | `auth-submit` | Botão submit auth |
| `bookmark-dialog` | `bookmark-modal` | Modal bookmark |
| `bookmark-close-btn` | `bookmark-modal-close` | Fechar modal bookmark |
| `bookmark-cancel-btn` | `bookmark-modal-close` | Cancelar (mesmo botão) |
| `bookmark-desc` | `bookmark-description` | Campo descrição |
| `bookmarks-list` | `bookmark-list` | Lista de bookmarks |
| `tags-cloud` | `popular-tags` | Nuvem de tags |
| `user-avatar` | `username-display` | Avatar/nome usuário |
| `logout-btn` | ⚠️ NÃO EXISTE | Precisa adicionar no HTML |
| `profile-btn` | Existe | Pode mapear para botão perfil |

## 🟡 Classes CSS (app.js usa Tailwind, HTML usa classes custom)

### Feed Filter Tabs (linha 782-787)
**Problema:** `toggleFeedButtons()` aplica classes Tailwind, mas HTML usa `.filter-tab` + `.active`

```javascript
// ❌ Atual (app.js linha 782-787)
allBtn.className = 'px-3 py-1.5 rounded-lg font-medium transition-colors text-purple-600 ...';

// ✅ Deveria ser
allBtn.classList.add('active');
mineBtn.classList.remove('active');
```

### Bookmark Items
**Problema:** Renderização de bookmarks usa classes Tailwind complexas

**HTML atual espera:**
```html
<article class="bookmark-item">
  <div class="bookmark-header">
    <a href="..." class="bookmark-url">...</a>
    <span class="bookmark-domain">...</span>
  </div>
  <p class="bookmark-description">...</p>
  <div class="bookmark-tags">
    <span class="tag">...</span>
  </div>
  <div class="bookmark-meta">...</div>
</article>
```

## 🔵 Elementos Removidos/Mudados

| app.js procura | Status no HTML | Solução |
|---|---|---|
| `dark-mode-toggle` | ❌ Não existe | Remover (design é light-only) |
| `feed-all-btn` / `feed-mine-btn` | Mudou estrutura | Usar `.filter-tab[data-feed="all"]` |
| `feed-title` | ❌ Não existe | Remover ou mapear para header |
| `feed-count` | ❌ Não existe | Remover |
| `empty-state-*` | ⚠️ Estrutura diferente | Revisar renderização |
| `filter-banner` | ⚠️ Não implementado | Adicionar ou remover |
| `pagination-container` | Mudou para `pagination` | Atualizar ID |
| `page-numbers` | Mudou para `pagination-info` | Atualizar ID |

## 🟢 Modais: <dialog> → <div class="modal">

**Problema:** app.js usa `<dialog>` API (`.showModal()`, `.close()`), mas HTML redesenhado usa `<div class="modal">` + `.active` class

### Auth Modal
```javascript
// ❌ Atual
const dialog = document.getElementById('auth-dialog');
dialog.showModal();

// ✅ Novo
const modal = document.getElementById('auth-modal');
modal.classList.add('active');
```

### Bookmark Modal
```javascript
// ❌ Atual
const dialog = document.getElementById('bookmark-dialog');
dialog.close();

// ✅ Novo
const modal = document.getElementById('bookmark-modal');
modal.classList.remove('active');
```

## 📋 Próximos Passos

1. ✅ Corrigir IDs de paginação (`prev-btn`, `next-btn`)
2. ⬜ Corrigir IDs de modais e botões de trigger
3. ⬜ Substituir `<dialog>` API por classe `.active`
4. ⬜ Atualizar função `toggleFeedButtons()` para usar `.active` class
5. ⬜ Atualizar função `renderBookmarks()` para usar classes CSS custom
6. ⬜ Atualizar função `renderTags()` para mapear para `#popular-tags`
7. ⬜ Remover referências a dark mode
8. ⬜ Adicionar botão logout no HTML ou remover funcionalidade
9. ⬜ Testar todos os fluxos: login, registro, criar bookmark, filtrar, paginar

## 🎯 Estimativa

- **IDs críticos**: 2-3h
- **Classes CSS**: 3-4h
- **Modal refactoring**: 1-2h
- **Testing completo**: 2-3h

**Total**: ~8-12h de trabalho
