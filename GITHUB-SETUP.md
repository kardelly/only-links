# Como Fazer Push para o GitHub

Você precisa autenticar com a conta correta do GitHub.

## Opção 1: Usar SSH (Recomendado)

### 1. Verificar se tem chave SSH

```bash
ls -la ~/.ssh
# Procure por: id_rsa.pub, id_ed25519.pub, etc.
```

### 2. Se não tiver, criar chave SSH

```bash
ssh-keygen -t ed25519 -C "seu-email@exemplo.com"
# Pressione Enter para aceitar o local padrão
# Digite uma senha (ou deixe vazio)
```

### 3. Copiar a chave pública

```bash
cat ~/.ssh/id_ed25519.pub
# Copie TODA a saída
```

### 4. Adicionar no GitHub

1. Ir para: https://github.com/settings/keys
2. Clicar em "New SSH key"
3. Título: "My Mac" (ou qualquer nome)
4. Colar a chave copiada
5. Clicar em "Add SSH key"

### 5. Testar conexão

```bash
ssh -T git@github.com
# Deve aparecer: "Hi kardelly! You've successfully authenticated..."
```

### 6. Mudar remote para SSH

```bash
cd /Users/andersonaf/Desktop/Antigravity/delicious-orfans
git remote set-url origin git@github.com:kardelly/only-links.git
```

### 7. Fazer push

```bash
git push -u origin main
```

---

## Opção 2: Usar Personal Access Token

### 1. Criar Token no GitHub

1. Ir para: https://github.com/settings/tokens
2. Clicar em "Generate new token" → "Generate new token (classic)"
3. Nome: "onlylinks-deploy"
4. Scopes: Marcar `repo` (todas as opções)
5. Clicar em "Generate token"
6. **COPIAR O TOKEN** (você não verá ele novamente!)

### 2. Fazer push com token

```bash
cd /Users/andersonaf/Desktop/Antigravity/delicious-orfans

# Formato: https://TOKEN@github.com/usuario/repo.git
git remote set-url origin https://SEU_TOKEN_AQUI@github.com/kardelly/only-links.git

git push -u origin main
```

---

## Opção 3: Usar GitHub CLI (Mais Fácil)

### 1. Instalar GitHub CLI

```bash
brew install gh
```

### 2. Fazer login

```bash
gh auth login
# Escolher:
# - GitHub.com
# - HTTPS
# - Login with a web browser
# Seguir instruções
```

### 3. Fazer push

```bash
cd /Users/andersonaf/Desktop/Antigravity/delicious-orfans
git push -u origin main
```

---

## Verificar Conta Atual

```bash
# Ver qual conta está configurada
git config user.name
git config user.email

# Ver conta do GitHub autenticada
gh auth status  # se tiver gh cli
```

---

## Problema: Conta Errada Autenticada

Se o git está usando `andersonafcit` mas você quer usar `kardelly`:

### 1. Limpar credenciais salvas

```bash
# macOS
git credential-osxkeychain erase
host=github.com
protocol=https
# Pressione Enter duas vezes

# OU deletar todas
git credential-osxkeychain erase
```

### 2. Reconfigurar git local

```bash
cd /Users/andersonaf/Desktop/Antigravity/delicious-orfans

git config user.name "Anderson Cardelli Façanha"
git config user.email "seu-email-kardelly@exemplo.com"
```

### 3. Usar SSH (evita problema de credenciais)

Siga a Opção 1 acima.

---

## Após configurar, fazer push:

```bash
cd /Users/andersonaf/Desktop/Antigravity/delicious-orfans
git push -u origin main
```

Deve ver algo como:

```
Enumerating objects: 49, done.
Counting objects: 100% (49/49), done.
Delta compression using up to 8 threads
Compressing objects: 100% (46/46), done.
Writing objects: 100% (49/49), 123.45 KiB | 12.34 MiB/s, done.
Total 49 (delta 2), reused 0 (delta 0), pack-reused 0
To github.com:kardelly/only-links.git
 * [new branch]      main -> main
Branch 'main' set up to track remote branch 'main' from 'origin'.
```

✅ **Pronto!** Seu código está no GitHub.

---

## Próximos commits

Depois que funcionar, para commits futuros:

```bash
git add .
git commit -m "Sua mensagem aqui"
git push
```
