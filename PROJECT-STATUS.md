# Status do Projeto — only.link

**Última atualização**: 2026-06-02  
**Ambiente de Produção**: https://only.link  
**Servidor**: 2.25.147.170 (Hostinger VPS)

---

## 📊 Status Geral

✅ **Desktop**: Funcionando 100%  
✅ **Mobile PWA**: Funcionando 100%  
✅ **Deploy**: Configurado e funcionando  
✅ **Segurança**: CSP, HTTPS, rate limiting implementados  
✅ **Analytics**: Google Analytics GA4 com consent GDPR

---

## 🎯 Features Principais

### ✅ Implementado e Funcionando

#### Mobile PWA
- Progressive Web App instalável (iOS + Android)
- Service Worker com cache offline
- Share Target API (receber links)
- Bottom navigation com 5 tabs
- Bottom sheet modal
- Animações de delícia ao salvar
- Auto-redirect de mobile devices
- Settings view completa

#### Desktop
- Landing page Apple-style
- Feed de bookmarks público/privado
- Busca e filtros por tags
- Sistema de follow/unfollow
- Perfis públicos de usuário
- Upload de avatar
- Password reset
- Metadata scraping (og:image, title, description)

#### Segurança
- Helmet.js com CSP configurado
- Rate limiting (15min / 5 tentativas)
- bcrypt password hashing
- JWT sessions (7 dias)
- Cookie httpOnly + secure + sameSite
- Input validation e sanitização
- HTTPS com Let's Encrypt

#### Analytics & GDPR
- Google Analytics GA4
- Cookie consent banner
- Google Consent Mode v2
- localStorage para preferências

---

## 🗂️ Estrutura do Projeto

```
delicious-orfans/
├── server.js                    # Backend Express
├── database.js                  # SQLite queries
├── bookmarks.db                 # Database (SQLite)
├── public/
│   ├── index.html              # Landing page desktop
│   ├── app.html                # App desktop
│   ├── profile.html            # Perfil de usuário
│   ├── settings.html           # Configurações
│   ├── mobile/
│   │   ├── mobile-app.html     # Shell do PWA
│   │   ├── mobile-app.js       # Controller
│   │   ├── mobile-styles.css   # Estilos completos
│   │   └── components/         # 7 componentes ES6
│   ├── components/
│   │   ├── cookie-consent.js   # GDPR consent
│   │   └── auth-modal.js       # Modal de login/registro
│   ├── manifest.json           # PWA manifest
│   ├── sw.js                   # Service Worker
│   └── favicon-*.png           # Icons PWA
└── docs/
    ├── CHANGELOG.md            # Histórico completo
    ├── FEATURES-IMPLEMENTED.md # Features detalhadas
    ├── PROJECT-STATUS.md       # Este arquivo
    ├── DEPLOY.md               # Guia de deploy
    └── SECURITY.md             # Documentação de segurança
```

---

## 🚀 Como Fazer Deploy

### 1. Commitar mudanças localmente
```bash
git add -A
git commit -m "feat: sua feature"
```

### 2. Push para GitHub
```bash
git push origin main
```

### 3. Deploy no servidor
```bash
ssh root@2.25.147.170
cd /var/www/onlylinks
git pull origin main
pm2 restart only-links
```

### 4. Verificar logs (opcional)
```bash
pm2 logs only-links
```

---

## 🔑 Variáveis de Ambiente

**Arquivo**: `.env` (não commitado)

```env
JWT_SECRET=<64+ caracteres aleatórios>
NODE_ENV=production
PORT=3000
ALLOWED_ORIGINS=https://only.link,https://www.only.link
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=5
```

⚠️ **Importante**: JWT_SECRET deve ter 64+ caracteres para segurança.

---

## 📱 Mobile PWA - Componentes

### Components ES6 Modules
1. **base-view.js** - Classe base com lifecycle (show/hide/load)
2. **feed-view.js** - Feed de bookmarks com filtros
3. **search-view.js** - Busca e filtros avançados
4. **add-bookmark-view.js** - Bottom sheet para criar bookmarks
5. **tags-view.js** - Lista de tags populares
6. **profile-view.js** - Perfil do usuário com stats
7. **settings-view.js** - Configurações da conta
8. **utils.js** - Funções utilitárias compartilhadas

### Animações de Delícia
- ✓ Botão Save transforma em checkmark verde
- 🎉 Toast com ícones animados (pop effect)
- 📳 Haptic feedback (vibração 50ms)
- 💚 Pulse animation no botão + após salvar
- ✨ Transições suaves (400ms ease-out-expo)

---

## 🔐 Segurança - Content Security Policy

```javascript
{
  defaultSrc: ["'self'"],
  styleSrc: [
    "'self'", 
    "'unsafe-inline'", 
    "https://fonts.googleapis.com",
    "https://use.typekit.net"
  ],
  fontSrc: [
    "'self'", 
    "data:", 
    "https://fonts.gstatic.com",
    "https://use.typekit.net"
  ],
  imgSrc: ["'self'", "data:", "https:"],
  scriptSrc: [
    "'self'",
    "'unsafe-inline'",
    "https://cdn.tailwindcss.com",
    "https://www.googletagmanager.com",
    "https://www.google-analytics.com",
    "https://use.typekit.net"
  ],
  connectSrc: [
    "'self'",
    "https://www.google-analytics.com",
    "https://analytics.google.com",
    "https://stats.g.doubleclick.net",
    "https://www.google.com"
  ]
}
```

---

## 📊 Database Schema

### Tabelas Principais
- **users** - Usuários (id, username, email, password_hash, avatar)
- **bookmarks** - Bookmarks (id, user_id, url, title, description, tags, is_public, og_image)
- **follows** - Relações de follow (follower_id, following_id)
- **user_preferences** - Preferências (user_id, default_public)
- **password_reset_tokens** - Tokens de reset de senha

### Indexes
- users.username (UNIQUE)
- users.email (UNIQUE)
- bookmarks.user_id
- follows.follower_id + following_id (COMPOSITE PRIMARY KEY)

---

## 🔗 API Endpoints Principais

### Authentication
- `POST /api/auth/register` - Criar conta
- `POST /api/auth/login` - Login (username ou email)
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Sessão atual
- `POST /api/auth/request-password-reset` - Reset de senha

### Bookmarks
- `GET /api/bookmarks` - Listar (query: q, tag, tags, feedType, user, page, limit)
- `POST /api/bookmarks` - Criar
- `PUT /api/bookmarks/:id` - Atualizar
- `DELETE /api/bookmarks/:id` - Deletar

### Users
- `GET /api/users/:username` - Perfil público
- `POST /api/users/:username/follow` - Seguir
- `DELETE /api/users/:username/follow` - Deixar de seguir
- `GET /api/users/:username/followers` - Seguidores
- `GET /api/users/:username/following` - Seguindo

### Settings
- `PUT /api/settings/username` - Mudar username
- `PUT /api/settings/email` - Mudar email
- `PUT /api/settings/password` - Mudar senha
- `POST /api/settings/avatar` - Upload avatar
- `DELETE /api/settings/account` - Deletar conta

### Metadata
- `GET /api/metadata?url=` - Scrape og:image, title, description

---

## 🐛 Bugs Conhecidos

### Desktop
- ⚠️ Edit bookmark: toggle não preenche com valor atual
- ⚠️ Filter tabs: "My links" não aparece quando deslogado
- ⚠️ Search: clear button não atualiza feed

### Mobile
✅ Todos os bugs conhecidos foram corrigidos

---

## 📈 Próximos Passos

### Alta Prioridade
- [ ] Testes automatizados (Jest + Supertest)
- [ ] Monitoring (Sentry ou similar)
- [ ] Database backup automático
- [ ] Health check endpoint

### Média Prioridade
- [ ] Collections (agrupar bookmarks)
- [ ] Busca full-text melhorada
- [ ] Exportar/importar bookmarks
- [ ] Keyboard shortcuts (/, n, esc)

### Baixa Prioridade
- [ ] API pública RESTful
- [ ] RSS feeds por usuário
- [ ] Email notifications
- [ ] Dark mode toggle

---

## 🛠️ Stack Tecnológica

**Backend**:
- Node.js 25.9.0
- Express.js 4.18.2
- SQLite3 (better-sqlite3)
- JWT, bcrypt, Helmet
- express-rate-limit

**Frontend Desktop**:
- Vanilla JavaScript ES6+
- CSS3 com OKLCH colors
- Apple-inspired design system

**Frontend Mobile**:
- Progressive Web App
- ES6 Modules
- Component-based architecture
- Bottom navigation + Bottom sheet patterns

**DevOps**:
- PM2 (process manager)
- Nginx (reverse proxy)
- Let's Encrypt (SSL)
- Hostinger VPS

---

## 📞 Informações de Contato

**Servidor**: root@2.25.147.170  
**Domínio**: only.link  
**Path**: /var/www/onlylinks  
**PM2 App**: only-links  
**Porta**: 3000 (interno, Nginx proxy na 80/443)

---

## 📝 Documentação Completa

- **CHANGELOG.md** - Histórico detalhado de mudanças
- **FEATURES-IMPLEMENTED.md** - Todas as features com detalhes
- **DEPLOY.md** - Guia completo de deploy
- **SECURITY.md** - Documentação de segurança
- **PRODUCT.md** - Visão e propósito do produto
- **DESIGN.md** - Design system e guidelines

---

**Última vez testado em produção**: 2026-06-02  
**Status**: ✅ Tudo funcionando perfeitamente
