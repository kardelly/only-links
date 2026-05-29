# Configuração VPS Hostinger - onlylinks.id

Guia de escolha de configuração ao criar VPS no Hostinger.

---

## 🎯 Configurações Recomendadas

### 1. **Plano VPS** (escolha baseada no orçamento)

| Plano | vCPU | RAM | Storage | Tráfego | Preço/mês | Recomendado para |
|-------|------|-----|---------|---------|-----------|------------------|
| **KVM 1** | 1 core | 4 GB | 50 GB SSD | 1 TB | ~$5-8 | ✅ **Desenvolvimento/Teste** |
| **KVM 2** | 2 cores | 8 GB | 100 GB SSD | 2 TB | ~$12-15 | ✅ **Produção (Inicial)** ⭐ |
| **KVM 4** | 4 cores | 16 GB | 200 GB SSD | 4 TB | ~$25-30 | Produção (Alto Tráfego) |

**💡 Recomendação:** Comece com **KVM 2** (2 cores, 8GB RAM)
- Suficiente para 1000-5000 usuários/dia
- Pode rodar Node.js + Nginx + backup confortavelmente
- Upgrade fácil se precisar mais recursos

---

### 2. **Sistema Operacional**

**Escolha:** ✅ **Ubuntu 22.04 LTS** (ou 20.04 LTS)

**Por quê?**
- LTS = Long Term Support (5 anos de atualizações)
- Mais documentação disponível
- Compatível com todos os scripts do projeto
- Suporte nativo a Node.js via NodeSource

**❌ Evite:**
- CentOS (descontinuado)
- Debian (mais complexo para iniciantes)
- Qualquer distribuição não-LTS

---

### 3. **Localização do Servidor**

**Escolha:** Servidor mais próximo do seu público-alvo

| Localização | Recomendado para |
|-------------|------------------|
| **São Paulo, Brasil** | ✅ Público brasileiro |
| **Miami, EUA** | América do Sul + América do Norte |
| **Nova York, EUA** | América do Norte |
| **Londres, UK** | Europa |
| **Singapura** | Ásia |

**💡 Para onlylinks.id:** Se domínio é .id (Indonésia) mas público é Brasil → escolha **São Paulo** (latência menor = app mais rápido)

---

### 4. **Período de Contratação**

| Período | Desconto | Recomendação |
|---------|----------|--------------|
| 1 mês | Sem desconto | ❌ Mais caro |
| 12 meses | ~30% off | ⚠️ Compromisso médio |
| 24 meses | ~40% off | ✅ Melhor custo-benefício |
| 48 meses | ~50% off | Se tiver certeza |

**💡 Primeira vez?** Contrate **1 mês** para testar, depois migre para plano anual.

---

### 5. **Configurações Adicionais** (na criação)

#### ✅ **Ative:**
- **SSH Access** - Essencial (já vem ativo)
- **Root Access** - Necessário para configuração inicial
- **IPv4 Address** - Necessário para o domínio

#### ⚠️ **Opcional (pode ativar depois):**
- **Backups Automáticos** ($2-5/mês) - Recomendado para produção
- **IPv6** - Não essencial no momento
- **DDoS Protection** - Hostinger já inclui básico

#### ❌ **Não precisa:**
- **Control Panel (cPanel/Plesk)** - Aumenta custo, não usaremos
- **Managed Services** - Faremos setup manual

---

## 📋 Passo a Passo de Criação

### 1. Login no Hostinger
https://hpanel.hostinger.com

### 2. Criar VPS
- Menu: **VPS** → **Order New VPS**
- Ou: **Hosting** → **Add Hosting** → **VPS**

### 3. Selecionar Plano
✅ **KVM 2** (2 vCPU, 8GB RAM, 100GB SSD)

### 4. Escolher Sistema Operacional
✅ **Ubuntu 22.04 LTS 64-bit**

### 5. Localização
✅ **São Paulo, Brazil** (ou mais próximo do seu público)

### 6. Período
- Primeiro deploy: **1 mês** (testar)
- Depois: **12 ou 24 meses** (economizar)

### 7. Add-ons (opcional)
- **Backups Automáticos:** ✅ Sim (se produção)
- Resto: ❌ Não precisa

### 8. Finalizar Compra
- Preencher dados de pagamento
- Confirmar

### 9. Aguardar Provisionamento
- Leva ~5-15 minutos
- Você receberá email com:
  - IP do servidor
  - Usuário root
  - Senha temporária

---

## 🔐 Após Criação - Primeiros Passos

### 1. Anotar Credenciais

Quando VPS estiver pronto, anote:

```
VPS IP Address: _______________
SSH Port: 22 (padrão)
Username: root
Password: _______________ (do email)
```

### 2. Conectar pela Primeira Vez

```bash
ssh root@SEU_IP_AQUI
# Digite a senha quando solicitado
```

### 3. Trocar Senha Root (Recomendado)

```bash
passwd
# Digite nova senha forte
# Confirme
```

### 4. Rodar Script de Setup

```bash
# Fazer upload do script
# (Na sua máquina local)
cd /Users/andersonaf/Desktop/Antigravity/delicious-orfans
scp vps-setup.sh root@SEU_IP:~/

# No VPS
bash ~/vps-setup.sh
```

---

## 💰 Estimativa de Custos

### Setup Inicial (Primeira vez)

| Item | Custo |
|------|-------|
| VPS KVM 2 (1 mês teste) | $12-15 |
| Domínio onlylinks.id (1 ano) | $15-20 |
| **Total inicial** | **~$30** |

### Mensal (Após teste)

| Item | Custo/mês |
|------|-----------|
| VPS KVM 2 | $12-15 |
| Backups (opcional) | $3-5 |
| **Total mensal** | **$12-20** |

### Anual (Mais econômico)

| Item | Custo/ano |
|------|-----------|
| VPS KVM 2 (12 meses) | $120-150 (~$10/mês) |
| Domínio renovação | $15-20 |
| **Total anual** | **$135-170** |

---

## 🔄 Upgrade Posterior (Se precisar)

Hostinger permite upgrade fácil sem migração:

```
KVM 1 (4GB) → KVM 2 (8GB) → KVM 4 (16GB) → KVM 8 (32GB)
```

**Quando fazer upgrade?**
- CPU uso consistente >80%
- RAM uso consistente >80%
- Tráfego mensal próximo do limite
- Resposta lenta mesmo otimizado

**Como verificar uso:**
```bash
# CPU e RAM
htop

# Disco
df -h

# Tráfego (no painel Hostinger)
```

---

## 📊 Comparação: Sua Necessidade vs Plano

### onlylinks.id - Estimativa

| Métrica | Valor Esperado | Plano Recomendado |
|---------|----------------|-------------------|
| Usuários simultâneos | 10-50 | KVM 2 (8GB) |
| Requests/segundo | 10-100 | KVM 2 |
| Database size | <100MB (início) | 100GB SSD OK |
| Uploads (avatars) | <500MB (início) | 100GB SSD OK |
| Tráfego mensal | <100GB | 2TB incluído OK |

**Conclusão:** KVM 2 é perfeito para começar e aguenta crescimento por 6-12 meses.

---

## ⚠️ Armadilhas Comuns

### ❌ **Não faça:**
1. **Pegar plano menor (KVM 1)** - Node.js precisa RAM, 4GB é mínimo apertado
2. **Esquecer backups** - Um erro pode perder tudo
3. **Não anotar credenciais** - Guarde em gerenciador de senhas
4. **Instalar painel de controle** - cPanel/Plesk desperdiça recursos

### ✅ **Faça:**
1. Comece com **Ubuntu 22.04 LTS**
2. Configure **backups automáticos** (ou script diário)
3. Troque senha padrão **imediatamente**
4. Anote IP e credenciais em local seguro
5. Configure **firewall** desde o início

---

## 🆘 Suporte

### Hostinger Support
- **Chat 24/7:** No painel hPanel
- **Tickets:** https://support.hostinger.com
- **Base de conhecimento:** https://support.hostinger.com/en/collections

### Documentação do Projeto
- **START-HERE.md** - Guia rápido deploy
- **DEPLOY.md** - Documentação completa
- **SECURITY.md** - Hardening

---

## 📝 Checklist de Criação

Antes de finalizar compra, confirme:

- [ ] Plano: KVM 2 (2 vCPU, 8GB RAM, 100GB SSD)
- [ ] OS: Ubuntu 22.04 LTS
- [ ] Localização: São Paulo (ou próxima do público)
- [ ] Período: 1 mês (teste) ou 12 meses (economia)
- [ ] Backups: Ativado (se produção)
- [ ] Gerenciador de senhas preparado para anotar credenciais

**Após receber email de confirmação:**
- [ ] Anotou IP do servidor
- [ ] Anotou usuário (root)
- [ ] Anotou senha temporária
- [ ] Conseguiu conectar via SSH
- [ ] Trocou senha padrão

---

**Próximo passo:** Depois que VPS estiver pronto, seguir **START-HERE.md**

**Tempo estimado setup:** 30-45 minutos do zero ao ar.

Good luck! 🚀
