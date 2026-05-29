# 🚀 Deploy onlylinks.id - Start Here

Seu guia rápido para colocar o projeto no ar.

---

## 📋 O que você tem

- ✅ Domínio registrado: **onlylinks.id** (Hostinger)
- ✅ VPS Hostinger com SSH
- ✅ Projeto pronto para deploy

---

## 🎯 Processo em 3 etapas (30 minutos)

### Etapa 1: Preparar Localmente (5 min)

```bash
cd /Users/andersonaf/Desktop/Antigravity/delicious-orfans

# Gerar pacote de deploy
./deploy-prepare.sh
```

Isso cria `onlylink-deploy.tar.gz` (~2MB).

---

### Etapa 2: Configurar VPS (15 min)

#### 2.1 Conectar no VPS

```bash
# Pegar credenciais no painel Hostinger:
# VPS → Detalhes → Acesso SSH

ssh root@SEU_IP_DO_VPS
# Digite a senha quando solicitado
```

#### 2.2 Rodar setup automático

```bash
# No VPS, baixar e rodar script de setup
curl -O https://raw.githubusercontent.com/seu-usuario/delicious-orfans/main/vps-setup.sh
bash vps-setup.sh
```

**OU** faça manualmente:

```bash
# Atualizar sistema
apt update && apt upgrade -y

# Instalar Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Instalar ferramentas
apt install -y nginx certbot python3-certbot-nginx git
npm install -g pm2

# Configurar firewall
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Criar usuário da aplicação
adduser onlylink
su - onlylink
mkdir ~/onlylink ~/backups
```

---

### Etapa 3: Fazer Deploy (10 min)

#### 3.1 Enviar arquivos

```bash
# Na sua máquina local
scp onlylink-deploy.tar.gz onlylink@SEU_IP:~/
```

#### 3.2 Extrair e configurar

```bash
# No VPS (como usuário onlylink)
cd ~/onlylink
tar -xzf ../onlylink-deploy.tar.gz
npm install --production

# Criar arquivo .env
nano .env
```

Cole isso (gere o secret com o comando abaixo):

```bash
NODE_ENV=production
PORT=3000
JWT_SECRET=COLE_O_SECRET_AQUI
ALLOWED_ORIGINS=https://onlylinks.id,https://www.onlylinks.id
```

Gerar JWT_SECRET:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Salvar: `Ctrl+X` → `Y` → `Enter`

#### 3.3 Iniciar com PM2

```bash
# Testar primeiro
npm start
# Viu "🚀 onlylinks.id Server"? Bom! Ctrl+C

# Voltar para root
exit

# Instalar PM2
npm install -g pm2

# Voltar para app user
su - onlylink
cd ~/onlylink

# Iniciar
pm2 start server.js --name onlylinks
pm2 save
pm2 startup  # Copie e rode o comando que aparecer
```

#### 3.4 Configurar Nginx

```bash
# Voltar para root
exit

# Criar config
nano /etc/nginx/sites-available/onlylinks
```

Cole:

```nginx
server {
    listen 80;
    server_name onlylinks.id www.onlylinks.id;
    client_max_body_size 2M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Ativar:

```bash
ln -s /etc/nginx/sites-available/onlylinks /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx
```

#### 3.5 Configurar DNS no Hostinger

No painel Hostinger → DNS do domínio onlylinks.id:

**Adicionar registro A:**
- Tipo: `A`
- Nome: `@`
- Aponta para: `SEU_IP_DO_VPS`
- TTL: `3600`

**Adicionar registro WWW:**
- Tipo: `A`
- Nome: `www`
- Aponta para: `SEU_IP_DO_VPS`
- TTL: `3600`

Aguarde 5-15 minutos para propagação.

**Testar:**
```bash
dig onlylinks.id +short
# Deve mostrar seu IP
```

#### 3.6 Ativar SSL (HTTPS)

```bash
# No VPS como root
certbot --nginx -d onlylinks.id -d www.onlylinks.id

# Seguir prompts:
# - Email: seu-email@exemplo.com
# - Concordar com termos: Y
# - Redirecionar HTTP para HTTPS: 2
```

---

## ✅ Verificar se está funcionando

Abrir no navegador: **https://onlylinks.id**

- [ ] Página carrega
- [ ] Cadeado SSL aparece
- [ ] Consegue registrar conta
- [ ] Consegue criar bookmark

---

## 📊 Monitoramento

```bash
# Ver logs
pm2 logs onlylinks

# Ver status
pm2 status

# Monitor em tempo real
pm2 monit

# Reiniciar
pm2 restart onlylinks
```

---

## 🔧 Manutenção

### Backup Automático

```bash
# Como usuário onlylink
nano ~/backup-db.sh
```

Cole:
```bash
#!/bin/bash
DATE=$(date +%Y%m%d-%H%M%S)
cp ~/onlylink/database.sqlite ~/backups/database-$DATE.sqlite
find ~/backups -name "database-*.sqlite" -mtime +7 -delete
```

Tornar executável e agendar:
```bash
chmod +x ~/backup-db.sh

crontab -e
# Adicionar linha:
0 3 * * * /home/onlylink/backup-db.sh
```

### Atualizar Aplicação

```bash
# Local: preparar nova versão
./deploy-prepare.sh
scp onlylink-deploy.tar.gz onlylink@SEU_IP:~/

# VPS: aplicar update
su - onlylink
cd ~/onlylink
tar -xzf ../onlylink-deploy.tar.gz
npm install --production
pm2 restart onlylinks
```

---

## 🆘 Problemas Comuns

### 502 Bad Gateway
```bash
pm2 restart onlylinks
systemctl restart nginx
```

### App não inicia
```bash
pm2 logs onlylinks --err
# Checar se JWT_SECRET está no .env
```

### SSL falhou
```bash
# Verificar DNS
dig onlylinks.id
# Tentar novamente
certbot --nginx -d onlylinks.id -d www.onlylinks.id
```

### Esqueci senha do VPS
- Resetar no painel Hostinger → VPS → Reset Password

---

## 📚 Documentação Completa

Para detalhes completos, consulte:
- **DEPLOY.md** - Guia detalhado passo a passo
- **DEPLOY-CHECKLIST.md** - Checklist interativo
- **SECURITY.md** - Hardening e melhores práticas
- **PRIVACY.md** - Política de privacidade

---

## 🎉 Próximos Passos Após Deploy

1. **Criar primeira conta** e testar todas funcionalidades
2. **Configurar backup** (script acima)
3. **Adicionar domínio customizado no email** (privacy@onlylinks.id)
4. **Configurar Google Search Console** para SEO
5. **Criar página /privacy** e /terms** no frontend
6. **Ativar monitoring** (opcional: UptimeRobot, Pingdom)

---

**Boa sorte! 🚀**

Se encontrar problemas, cheque os logs: `pm2 logs onlylinks`
