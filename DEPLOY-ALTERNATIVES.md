# Alternativas de Deploy - Sem VPS

Opções para hospedar onlylinks.id sem precisar de VPS.

---

## 🚀 Opções Recomendadas (Ordem de Facilidade)

### 1. ⭐ **Railway.app** (MAIS FÁCIL)

**Prós:**
- ✅ Deploy em 5 minutos via GitHub
- ✅ HTTPS automático
- ✅ Domínio customizado grátis
- ✅ Banco SQLite funciona
- ✅ $5 grátis/mês (suficiente para testar)

**Contras:**
- ⚠️ Depois dos créditos: ~$10-20/mês

**Como usar:**
1. Criar conta: https://railway.app
2. "New Project" → "Deploy from GitHub"
3. Conectar repositório `kardelly/only-links`
4. Adicionar variáveis de ambiente (JWT_SECRET, etc.)
5. Deploy automático!

**Custo:** $5 grátis → depois ~$10-20/mês

---

### 2. 🔷 **Render.com**

**Prós:**
- ✅ Plano gratuito disponível
- ✅ Deploy via GitHub
- ✅ HTTPS automático
- ✅ Domínio customizado grátis
- ✅ Backups automáticos (pago)

**Contras:**
- ⚠️ Plano grátis: app "dorme" após 15 min inativo
- ⚠️ Plano pago: $7/mês (mas sempre ativo)

**Como usar:**
1. Criar conta: https://render.com
2. "New" → "Web Service"
3. Conectar GitHub `kardelly/only-links`
4. Build Command: `npm install`
5. Start Command: `npm start`
6. Adicionar variáveis de ambiente
7. Deploy!

**Custo:** 
- Grátis (com limitações)
- OU $7/mês (sempre ativo)

---

### 3. 🟣 **Fly.io**

**Prós:**
- ✅ Plano gratuito generoso
- ✅ 3GB RAM grátis
- ✅ SQLite persistente (volumes)
- ✅ HTTPS automático
- ✅ Múltiplas regiões

**Contras:**
- ⚠️ Requer cartão de crédito
- ⚠️ Configuração mais técnica

**Como usar:**
1. Instalar CLI: `brew install flyctl`
2. Login: `flyctl auth login`
3. Na pasta do projeto: `flyctl launch`
4. Configurar fly.toml
5. Deploy: `flyctl deploy`

**Custo:** Grátis até 3 apps

---

### 4. 🔵 **DigitalOcean App Platform**

**Prós:**
- ✅ Deploy via GitHub
- ✅ HTTPS automático
- ✅ $200 crédito grátis (60 dias) com cupom
- ✅ Escalável
- ✅ Boa documentação

**Contras:**
- ⚠️ Depois dos créditos: $12/mês

**Como usar:**
1. Criar conta: https://www.digitalocean.com
2. Apps → Create App
3. Conectar GitHub
4. Configurar variáveis
5. Deploy

**Custo:** $200 grátis (60 dias) → depois $12/mês

---

### 5. 🟢 **Heroku** (Clássico)

**Prós:**
- ✅ Fácil de usar
- ✅ Deploy via GitHub
- ✅ Muitos tutoriais

**Contras:**
- ❌ Plano grátis foi removido
- ⚠️ $7/mês mínimo (Eco Dyno)
- ⚠️ SQLite não persiste (precisa PostgreSQL)

**Não recomendado** para este projeto (SQLite não funciona bem).

---

### 6. ⚫ **Vercel** (Frontend)

**Contras:**
- ❌ Não suporta Node.js persistente
- ❌ Não funciona com SQLite
- ❌ Apenas Serverless Functions (limitado)

**Não funciona** para este projeto.

---

### 7. 🟠 **Netlify** (Frontend)

**Contras:**
- ❌ Igual ao Vercel
- ❌ Não suporta backend Node.js completo

**Não funciona** para este projeto.

---

## 📊 Comparação Rápida

| Plataforma | Facilidade | Grátis? | Custo após | SQLite OK? | Recomendado? |
|------------|------------|---------|------------|------------|--------------|
| **Railway** | ⭐⭐⭐⭐⭐ | $5 crédito | $10-20/mês | ✅ | ✅ **SIM** |
| **Render** | ⭐⭐⭐⭐⭐ | Sim* | $7/mês | ✅ | ✅ **SIM** |
| **Fly.io** | ⭐⭐⭐⭐ | Sim | Grátis* | ✅ | ✅ Sim |
| **DigitalOcean** | ⭐⭐⭐⭐ | $200/60d | $12/mês | ✅ | ⚠️ OK |
| **Heroku** | ⭐⭐⭐⭐ | Não | $7/mês | ❌ | ❌ Não |
| **Vercel** | ⭐⭐⭐⭐⭐ | Sim | - | ❌ | ❌ Não |
| **Hostinger VPS** | ⭐⭐⭐ | Não | $12/mês | ✅ | ✅ Melhor longo prazo |

\* Com limitações

---

## 🎯 Recomendação para onlylinks.id

### **Para Começar AGORA (Teste):**
✅ **Railway.app** ou **Render.com**
- Deploy em minutos
- Sem custo inicial
- Fácil de usar

### **Para Produção (Longo Prazo):**
✅ **Hostinger VPS**
- Mais controle
- Custo previsível ($12/mês)
- Melhor performance
- Sem limitações

---

## 📋 Guia Rápido: Railway.app (Recomendado para Teste)

### Passo 1: Preparar Projeto

Criar `railway.json` na raiz:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### Passo 2: Criar Conta Railway

1. Ir para: https://railway.app
2. Clicar "Login with GitHub"
3. Autorizar Railway

### Passo 3: Criar Projeto

1. "New Project"
2. "Deploy from GitHub repo"
3. Selecionar `kardelly/only-links`
4. Railway detecta Node.js automaticamente

### Passo 4: Configurar Variáveis

No dashboard Railway:
1. Clicar no serviço
2. "Variables" tab
3. Adicionar:

```
NODE_ENV=production
PORT=3000
JWT_SECRET=GERAR_UM_SEGREDO_FORTE_AQUI
ALLOWED_ORIGINS=https://seu-app.railway.app,https://onlylinks.id
```

Gerar JWT_SECRET:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Passo 5: Deploy

- Railway faz deploy automático!
- Aguardar ~2-3 minutos
- URL gerada: `https://seu-app.railway.app`

### Passo 6: Conectar Domínio Customizado

1. No Railway: Settings → Domains
2. Add Domain: `onlylinks.id`
3. Railway mostra DNS records para adicionar
4. No Hostinger DNS:
   - Tipo: `CNAME`
   - Nome: `@` (ou `www`)
   - Aponta para: `seu-app.railway.app`
5. Aguardar propagação (5-30 min)

**Pronto!** App no ar em `https://onlylinks.id`

---

## 📋 Guia Rápido: Render.com (Alternativa Grátis)

### Passo 1: Criar Conta

1. Ir para: https://render.com
2. "Get Started" → Login com GitHub

### Passo 2: Criar Web Service

1. Dashboard → "New" → "Web Service"
2. "Connect a repository" → Selecionar `kardelly/only-links`
3. Configurar:

```
Name: onlylinks
Region: Oregon (US West) - Grátis
Branch: main
Runtime: Node
Build Command: npm install
Start Command: npm start
Instance Type: Free (ou Starter $7/mês)
```

### Passo 3: Variáveis de Ambiente

Em "Environment":

```
NODE_ENV=production
JWT_SECRET=GERAR_FORTE_AQUI
ALLOWED_ORIGINS=https://onlylinks.onrender.com,https://onlylinks.id
```

### Passo 4: Deploy

- Clicar "Create Web Service"
- Aguardar ~5 minutos
- URL: `https://onlylinks.onrender.com`

### Passo 5: Domínio Customizado (Grátis)

1. Service → Settings → Custom Domain
2. Adicionar: `onlylinks.id`
3. Render mostra DNS records
4. No Hostinger: adicionar CNAME
5. Aguardar propagação

**Pronto!** App no ar.

---

## 💾 Importante: Backups do SQLite

Em plataformas gerenciadas, configure backup do database:

### Railway
```bash
# Baixar database manualmente
railway run sqlite3 database.sqlite .dump > backup.sql
```

### Render
- Usar Render Disks (persistente)
- Ou migrar para PostgreSQL

### Fly.io
- Volumes persistem automaticamente
- Comando backup:
```bash
flyctl ssh console
sqlite3 database.sqlite .dump > backup.sql
```

---

## 🔄 Migração Futura

**Começou em Railway/Render?**

Fácil migrar para VPS depois:

1. Exportar database SQLite
2. Configurar VPS (START-HERE.md)
3. Importar database
4. Mudar DNS para VPS IP
5. Cancelar Railway/Render

**Tempo:** ~30 minutos

---

## 🤔 Qual Escolher?

### Você quer:

**✅ Testar rápido (hoje mesmo):**
→ **Railway.app** ($5 grátis, deploy em 5 min)

**✅ Grátis mas OK com "dormir":**
→ **Render.com Free** (dorme após 15 min inativo)

**✅ Grátis e sempre ativo:**
→ **Fly.io** (3GB RAM grátis, sem dormir)

**✅ Controle total, longo prazo:**
→ **Hostinger VPS** (setup manual, mas melhor custo-benefício)

**✅ Sem cartão de crédito:**
→ **Render.com Free** (único que não pede cartão)

---

## 💡 Minha Recomendação

**Para você agora:**

1. **Começar:** Railway.app (rápido, fácil, $5 grátis)
2. **Testar:** Ver se o app funciona bem, ter feedback de usuários
3. **Decidir:** 
   - Se tráfego baixo: continuar Railway/Render
   - Se tráfego alto: migrar para VPS

**Economia:**
- Teste 1-2 meses em Railway ($5 grátis + $10-20)
- Depois migre para VPS se valer a pena

---

## 📝 Próximo Passo

**Quer fazer deploy agora?**

Escolha um:
- [ ] Railway.app (mais fácil)
- [ ] Render.com (grátis)
- [ ] Fly.io (grátis, mais técnico)
- [ ] DigitalOcean ($200 crédito)

Posso criar o guia detalhado da que você escolher!
