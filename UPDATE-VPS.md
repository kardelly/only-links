# Atualizar VPS com Novas Features

Guia para fazer deploy das novas funcionalidades no VPS.

## 📦 O Que Foi Adicionado

### Páginas Novas
- ✅ `/privacy` - Política de Privacidade
- ✅ `/terms` - Termos de Serviço  
- ✅ `/bookmarklet` - Instruções do Bookmarklet
- ✅ `/extension` - Instruções da Extensão Chrome
- ✅ `/api/bookmarklet` - Popup do Bookmarklet

### Funcionalidades Novas
- ✅ Sistema de recuperação de senha
- ✅ Indicador de força de senha
- ✅ Bookmarklet funcional
- ✅ Extensão Chrome (em `/chrome-extension/`)
- ✅ Google Analytics em todas as páginas

### Mudanças no Banco de Dados
- ✅ Nova tabela `password_reset_tokens`
- ✅ Novos índices automáticos

## 🚀 Como Atualizar o VPS

### Opção 1: Update Automático (Recomendado)

```bash
# Na sua máquina local
cd /Users/andersonaf/Desktop/Antigravity/delicious-orfans

# 1. Push para GitHub
git push origin main

# 2. Conectar no VPS
ssh root@2.25.147.170

# 3. No VPS - Ir para pasta do projeto
cd /var/www/onlylinks

# 4. Parar a aplicação
pm2 stop onlylinks

# 5. Fazer pull das mudanças
git pull origin main

# 6. Instalar novas dependências (se houver)
npm install --production

# 7. Restart da aplicação
pm2 restart onlylinks

# 8. Verificar logs
pm2 logs onlylinks --lines 20

# 9. Testar
curl http://localhost:3000/privacy
```

### Opção 2: Deploy Manual com Tarball

Se você não tem Git configurado no VPS:

```bash
# Na sua máquina local
cd /Users/andersonaf/Desktop/Antigravity/delicious-orfans

# 1. Criar tarball
tar -czf onlylinks-update.tar.gz \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='database.sqlite' \
  --exclude='*.tar.gz' \
  --exclude='uploads' \
  *.js package*.json public/ chrome-extension/

# 2. Enviar para VPS
scp onlylinks-update.tar.gz root@2.25.147.170:/tmp/

# 3. Conectar no VPS
ssh root@2.25.147.170

# 4. No VPS - Parar aplicação
pm2 stop onlylinks

# 5. Backup do database (precaução)
cp /var/www/onlylinks/database.sqlite /var/www/onlylinks/database.sqlite.backup

# 6. Extrair atualização
cd /var/www/onlylinks
tar -xzf /tmp/onlylinks-update.tar.gz

# 7. Instalar dependências
npm install --production

# 8. Restart
pm2 restart onlylinks

# 9. Verificar
pm2 logs onlylinks --lines 20
```

## ✅ Verificar Deploy

Após o deploy, testar:

```bash
# No VPS
curl http://localhost:3000/privacy
curl http://localhost:3000/terms
curl http://localhost:3000/bookmarklet
```

**No navegador:**
1. https://onlylinks.id/privacy
2. https://onlylinks.id/terms
3. https://onlylinks.id/bookmarklet
4. Testar recuperação de senha no login

## 🗄️ Migração do Banco de Dados

A tabela `password_reset_tokens` será criada automaticamente quando o servidor iniciar.

**Não precisa rodar SQL manualmente!** 

O código em `database.js` já cria a tabela se ela não existir.

## 🔍 Troubleshooting

### Erro: "password_reset_tokens table not found"
```bash
# Restart força recriação das tabelas
pm2 restart onlylinks --update-env
```

### Erro: "Cannot find module"
```bash
# Reinstalar dependências
cd /var/www/onlylinks
rm -rf node_modules package-lock.json
npm install --production
pm2 restart onlylinks
```

### Erro: Port 3000 já em uso
```bash
# Ver o que está rodando
pm2 list

# Se tiver duplicado
pm2 delete onlylinks
pm2 start server.js --name onlylinks
```

### CSS/JS não carregando
```bash
# Verificar permissões
ls -la /var/www/onlylinks/public/

# Se necessário
chmod -R 755 /var/www/onlylinks/public/
```

## 🎯 Checklist Pós-Deploy

- [ ] Aplicação reiniciou sem erros
- [ ] `/privacy` carrega corretamente
- [ ] `/terms` carrega corretamente
- [ ] `/bookmarklet` carrega e bookmarklet funciona
- [ ] Recuperação de senha funciona (testar com conta de teste)
- [ ] Indicador de força de senha aparece no cadastro
- [ ] Google Analytics está trackando (ver painel GA após algumas horas)
- [ ] Links no footer da landing page funcionam

## 📊 Monitoramento

```bash
# Ver logs em tempo real
pm2 logs onlylinks

# Ver uso de recursos
pm2 monit

# Ver status
pm2 status
```

## 🔄 Rollback (Se necessário)

Se algo der errado:

```bash
# No VPS
pm2 stop onlylinks

# Restaurar backup do database
cp /var/www/onlylinks/database.sqlite.backup /var/www/onlylinks/database.sqlite

# Voltar para commit anterior
cd /var/www/onlylinks
git reset --hard 032662b  # commit anterior ao update

# Restart
pm2 restart onlylinks
```

## 📝 Notas

- **Banco de dados:** SQLite é persistente, não será afetado pelo update
- **Uploads:** Pasta `uploads/avatars/` não é tocada pelo deploy
- **Sessões:** Usuários logados continuam logados (cookies de 7 dias)
- **.env:** Não é alterado pelo deploy (suas variáveis estão seguras)

## 🎉 Após Deploy Bem-Sucedido

1. Testar todas as novas páginas
2. Criar uma conta de teste e testar recuperação de senha
3. Testar o bookmarklet salvando um link
4. Verificar Google Analytics no painel (após 24h)
5. Anunciar novas features para usuários (se houver)

---

**Tempo estimado:** 5-10 minutos

**Dificuldade:** ⭐⭐☆☆☆ (Fácil)

Bom deploy! 🚀
