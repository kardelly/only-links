# Features Implementadas — delicious.modern

**Data**: 2026-05-28  
**Status**: Em progresso

## ✅ Completo

### 1. Design System Apple-Style (Task #6)
- ✅ Home page landing (`index-apple-evolution.html`)
- ✅ App completo redesenhado (`index-apple-complete.html` → `index.html`)
- ✅ Documentação completa (`APPLE-DESIGN-SYSTEM.md`)
- ✅ Ambient gradients sutis
- ✅ Pill buttons (border-radius 980px)
- ✅ SF Pro-inspired typography
- ✅ Toggle switches estilo iOS
- ✅ Sequential fade-in animations
- ✅ Glass header sutil com backdrop-filter

### 2. Flag Público/Privado nos Bookmarks (Task #8)
- ✅ Campo `is_public` no schema (migration automática)
- ✅ Toggle switch no form de criação/edição
- ✅ Filtro backend: bookmarks privados não aparecem em feeds públicos
- ✅ Usuários veem seus próprios bookmarks privados
- ✅ Endpoint `/api/bookmarks` atualizado
- ✅ `createBookmark()` e `updateBookmark()` suportam `is_public`

**Uso:**
```javascript
// Criar bookmark público (default)
POST /api/bookmarks
{ url, title, description, tags, is_public: true }

// Criar bookmark privado
POST /api/bookmarks
{ url, title, description, tags, is_public: false }

// Atualizar privacidade
PUT /api/bookmarks/:id
{ is_public: false }
```

### 3. Correções de Fluxos (Task #11)
- ✅ Modais funcionando com `.modal.active` pattern
- ✅ `app.js` sincronizado com IDs corretos
- ✅ Forms de auth e bookmark funcionais
- ✅ Skeleton loading com classes corretas
- ✅ `saveBookmark()` usando `dataset.editingId`

### 4. Preview de Imagem dos Links (Task #10)
- ✅ Campo `og_image` no schema (migration automática)
- ✅ Endpoint `/api/metadata` para scrape de og:image, og:title, og:description, keywords
- ✅ Scraping automático no blur do campo URL (apenas em criação, não em edição)
- ✅ Exibir thumbnail no bookmark item com aspect ratio e object-fit
- ✅ Armazenar og_image no POST e PUT /api/bookmarks
- ✅ Fallback onerror para ocultar thumbnail se imagem não carregar
- ✅ CSS com hover scale effect no thumbnail
- ✅ Limpeza de dataset.ogImage ao fechar/resetar modal

**Uso:**
```javascript
// Metadata endpoint (autenticado)
GET /api/metadata?url=https://example.com
Response: { title, description, tags, og_image }

// Criar bookmark com og_image
POST /api/bookmarks
{ url, title, description, tags, is_public, og_image }

// Thumbnail rendering
if (item.og_image) {
  <img src="og_image" onerror="this.parentElement.style.display='none'">
}
```

## 🚧 Pendente

### 1. Perfil Público do Usuário (Task #7)
**Status**: Não iniciado

**Pendente:**
- ⬜ Rota `/user/:username` no backend
- ⬜ Página HTML de perfil público
- ⬜ Estatísticas do usuário (total bookmarks, tags, joined date)
- ⬜ Feed de bookmarks públicos do usuário
- ⬜ Link clicável em `@username` nos bookmarks

**Design:**
```
/user/johndoe
├── Header com username e stats
├── Grid com bookmarks públicos
└── Sidebar com tags populares do usuário
```

### 2. Página de Configurações (Task #9)
**Status**: Não iniciado

**Pendente:**
- ⬜ Rota `/settings` no backend
- ⬜ Página HTML de configurações
- ⬜ Form de mudança de senha
- ⬜ Toggle de privacy defaults (novo bookmark público/privado por default)
- ⬜ Seção "Danger Zone" com delete account
- ⬜ Opção de email notifications (futuro)

**Design:**
```
/settings
├── Account
│   ├── Change password
│   └── Email (view only)
├── Privacy
│   └── Default visibility for new bookmarks
└── Danger Zone
    └── Delete account
```

## 📋 TODO (Futuro)

### Features Adicionais
- [ ] **Busca avançada** - Filtros por data, usuário, domínio
- [ ] **Exportar bookmarks** - JSON, CSV, HTML
- [ ] **Importar bookmarks** - Do navegador, Pinboard, Pocket
- [ ] **Keyboard shortcuts** - /, n, esc, enter
- [ ] **Collections** - Agrupar bookmarks em coleções públicas
- [ ] **Following users** - Ver feed de quem você segue
- [ ] **API pública** - RESTful API para apps externos
- [ ] **RSS feeds** - /user/:username/rss

### Melhorias UX
- [ ] **Infinite scroll** - Ao invés de paginação
- [ ] **Drag bookmarklet** - Visual feedback no drag
- [ ] **Undo delete** - Toast com undo
- [ ] **Bulk actions** - Selecionar múltiplos bookmarks
- [ ] **Quick edit** - Editar tags inline sem modal
- [ ] **Duplicate detection** - Avisar se URL já existe

### Performance
- [ ] **Service Worker** - Offline support
- [ ] **Image lazy loading** - Thumbnails
- [ ] **Debounce search** - Já tem (300ms)
- [ ] **Cache popular tags** - Redis
- [ ] **CDN** - Servir assets estáticos

### Mobile
- [ ] **PWA** - Add to home screen
- [ ] **Share sheet** - Integração nativa mobile
- [ ] **Pull to refresh** - Feed
- [ ] **Swipe actions** - Delete/edit bookmarks

## 🐛 Bugs Conhecidos

- ⚠️ **Edit bookmark** - Precisa preencher toggle com valor atual
- ⚠️ **Filter tabs** - "My links" não aparece quando deslogado
- ⚠️ **Search** - Clear button não atualiza feed
- ⚠️ **Tags** - Click na tag não filtra (falta evento)
- ⚠️ **Pagination** - Info não atualiza corretamente
- ⚠️ **Empty state** - Botão "Add first link" precisa evento

## 📊 Schema Atual

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE bookmarks (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  is_public INTEGER DEFAULT 1,      -- ✅ NEW
  og_image TEXT,                     -- ✅ NEW
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE tags (
  id INTEGER PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);

CREATE TABLE bookmark_tags (
  bookmark_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  PRIMARY KEY (bookmark_id, tag_id),
  FOREIGN KEY(bookmark_id) REFERENCES bookmarks(id),
  FOREIGN KEY(tag_id) REFERENCES tags(id)
);
```

## 🔑 Endpoints API

### Auth
- `POST /api/auth/register` - Criar conta
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Sessão atual

### Bookmarks
- `GET /api/bookmarks` - Listar (suporta ?q=, ?tag=, ?mine=true)
- `POST /api/bookmarks` - Criar (✅ suporta is_public)
- `PUT /api/bookmarks/:id` - Atualizar (✅ suporta is_public)
- `DELETE /api/bookmarks/:id` - Deletar

### Tags
- `GET /api/tags/popular` - Tags mais usadas

### Metadata (TODO)
- `POST /api/metadata` - Scrape og:image de URL

### User Profile (TODO)
- `GET /api/users/:username` - Perfil público
- `GET /api/users/:username/bookmarks` - Bookmarks públicos

### Settings (TODO)
- `PUT /api/settings/password` - Mudar senha
- `DELETE /api/account` - Deletar conta

## 🚀 Deploy Checklist

Antes de produção:
- [ ] Variáveis de ambiente configuradas
- [ ] JWT_SECRET forte (64+ chars)
- [ ] NODE_ENV=production
- [ ] HTTPS habilitado
- [ ] Rate limiting configurado
- [ ] CORS origins corretos
- [ ] Database backup automático
- [ ] Error logging (Sentry)
- [ ] Analytics opcional
- [ ] Health check endpoint

---

**Desenvolvido com**:
- `$impeccable layout` - Design system Apple-style
- Claude Code - Refactoring e sync app.js
- Manual testing - Validação de fluxos
