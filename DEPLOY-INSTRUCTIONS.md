# Deploy Instructions for only.link

## Changes Deployed

✅ **Componentization complete:**
- Header compartilhado com logo.png
- Modal de autenticação compartilhado (login, signup, recuperação de senha)
- Modais de bookmark compartilhados (criar/editar, deletar)
- Todos os componentes reutilizáveis entre páginas

✅ **Problemas corrigidos:**
- Logo atualizado em todos headers
- Botões de login/signup unificados
- Login e signup funcionando em todas as páginas
- Privacy e terms acessíveis

## Arquivo para Deploy

📦 **Arquivo:** `only-links-deploy-20260529-141228.tar.gz` (1.4MB)

## Como fazer deploy no VPS (2.25.147.170)

### Opção 1: Via FileZilla (Recomendado)

1. Abra o FileZilla
2. Conecte no servidor:
   - Host: `2.25.147.170`
   - Username: `root` (ou seu usuário)
   - Password: [sua senha]
   - Port: `22`

3. Navegue até `/var/www/only-links`
4. Faça upload do arquivo `only-links-deploy-20260529-141228.tar.gz`

5. No terminal do FileZilla (ou SSH separado):
   ```bash
   cd /var/www/only-links
   tar -xzf only-links-deploy-20260529-141228.tar.gz
   npm install --production
   pm2 restart only-links
   ```

### Opção 2: Via Hostinger hPanel

1. Acesse o hPanel da Hostinger
2. Vá em File Manager
3. Navegue até `/var/www/only-links`
4. Faça upload do arquivo tar.gz
5. Use o Terminal do hPanel:
   ```bash
   cd /var/www/only-links
   tar -xzf only-links-deploy-20260529-141228.tar.gz
   npm install --production
   pm2 restart only-links
   ```

### Opção 3: Via SCP (se configurar chave SSH)

```bash
scp only-links-deploy-20260529-141228.tar.gz root@2.25.147.170:/var/www/only-links/
ssh root@2.25.147.170
cd /var/www/only-links
tar -xzf only-links-deploy-20260529-141228.tar.gz
npm install --production
pm2 restart only-links
```

## Verificação pós-deploy

Após o deploy, verifique:

1. **Logo aparecendo:** https://onlylinks.id/app
   - Header deve mostrar logo.png ao invés de emoji

2. **Login/Signup funcionando:** 
   - Clique em "Login" no header
   - Modal deve abrir com abas "Login" e "Sign up"
   - Teste fazer login

3. **Páginas estáticas:**
   - https://onlylinks.id/privacy
   - https://onlylinks.id/terms
   - https://onlylinks.id/bookmarklet
   - https://onlylinks.id/extension

4. **Console do navegador:**
   - Abra DevTools (F12)
   - Não deve ter erros 404 nos componentes

## Rollback (se necessário)

Se algo der errado, restaure o backup anterior:

```bash
cd /var/www/only-links
git reset --hard HEAD~1
npm install --production
pm2 restart only-links
```

## Próximos passos

Após o deploy bem-sucedido:
- [ ] Verificar Google Analytics está trackando
- [ ] Testar bookmarklet
- [ ] Testar extensão Chrome
- [ ] Monitorar logs: `pm2 logs only-links`
