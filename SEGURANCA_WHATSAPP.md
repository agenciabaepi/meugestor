# 🔒 Segurança de Vinculação WhatsApp

## ✅ Melhorias Implementadas

### 1. **Bloqueio de Uso Não Autorizado**
- ✅ O bot **NÃO funciona** para números não vinculados a usuários autenticados
- ✅ Não cria mais tenants temporários
- ✅ Mensagem clara informando necessidade de cadastro

**Antes:**
- Qualquer pessoa podia usar o bot sem cadastro
- Sistema criava tenants temporários automaticamente

**Agora:**
- Apenas números vinculados a contas autenticadas podem usar o bot
- Mensagem de bloqueio informa como se cadastrar

### 2. **Verificação OTP (One-Time Password)**
- ✅ Sistema de verificação via código de 6 dígitos
- ✅ Código enviado via WhatsApp para validar propriedade do número
- ✅ Código expira em 10 minutos
- ✅ Previne vinculação de números que não pertencem ao usuário

**Fluxo:**
1. Usuário solicita vinculação no perfil
2. Sistema envia código OTP para o WhatsApp
3. Usuário informa o código recebido
4. Sistema valida e vincula o número

### 3. **Validação de Números Duplicados**
- ✅ Constraint `UNIQUE(whatsapp_number)` no banco de dados
- ✅ Verificação antes de vincular
- ✅ Verificação antes de registrar
- ✅ Mensagem clara quando número já está em uso

**Proteções:**
- Número não pode ser vinculado a múltiplos usuários
- Verificação em múltiplas camadas (aplicação + banco)

### 4. **Rate Limiting**
- ✅ Limite de 10 mensagens por minuto por número
- ✅ Limite de 100 mensagens por hora por número
- ✅ Mensagem informativa quando limite é excedido
- ✅ Previne spam e abuso

**Configuração:**
```typescript
MAX_REQUESTS_PER_WINDOW = 10  // Por minuto
MAX_REQUESTS_PER_HOUR = 100   // Por hora
```

### 5. **Validações de Segurança**
- ✅ Normalização de números (remove caracteres não numéricos)
- ✅ Validação de formato (mínimo 10 dígitos)
- ✅ Verificação de assinatura do webhook (HMAC)
- ✅ Verificação de token de webhook

## 📋 Como Funciona Agora

### Cadastro de Novo Usuário
1. Usuário preenche formulário com email, senha e WhatsApp
2. Sistema verifica se o número já está em uso
3. Se disponível, cria conta e vincula número automaticamente
4. Trigger no banco garante que número seja único

### Vinculação de WhatsApp (Usuário Existente)
1. Usuário faz login
2. Acessa perfil e solicita vinculação
3. Sistema envia código OTP para o WhatsApp
4. Usuário informa código recebido
5. Sistema valida código e vincula número
6. Confirmação enviada via WhatsApp

### Uso do Bot
1. Usuário envia mensagem para o bot
2. Sistema verifica rate limiting
3. Sistema busca usuário vinculado ao número
4. **Se não encontrar usuário vinculado:**
   - Bloqueia uso
   - Envia mensagem informando necessidade de cadastro
5. **Se encontrar usuário vinculado:**
   - Processa mensagem normalmente
   - Responde com IA

## 🛡️ Proteções Implementadas

### Contra Fraudes
- ✅ Não permite uso sem cadastro
- ✅ Verifica propriedade do número via OTP
- ✅ Impede números duplicados
- ✅ Rate limiting previne abuso

### Contra Spam
- ✅ Limite de mensagens por minuto
- ✅ Limite de mensagens por hora
- ✅ Mensagens informativas quando bloqueado

### Validações
- ✅ Formato de número válido
- ✅ Número único no sistema
- ✅ Código OTP válido e não expirado
- ✅ Usuário autenticado

## 📝 Arquivos Modificados

1. **`lib/modules/auth.ts`**
   - Removida criação de tenants temporários
   - Apenas retorna tenant se número estiver vinculado

2. **`app/api/whatsapp/webhook/route.ts`**
   - Adicionado bloqueio para números não vinculados
   - Adicionado rate limiting
   - Mensagens informativas

3. **`app/api/auth/link-whatsapp/route.ts`**
   - Implementado sistema OTP
   - Verificação de código antes de vincular

4. **`lib/modules/whatsapp-verification.ts`** (NOVO)
   - Sistema completo de verificação OTP
   - Envio e validação de códigos

5. **`lib/utils/whatsapp-rate-limit.ts`** (NOVO)
   - Rate limiting específico para WhatsApp
   - Limites por minuto e por hora

## 🔐 Constraints no Banco de Dados

```sql
-- Garante que cada número só pode estar vinculado a um usuário
UNIQUE(whatsapp_number)

-- Índice para busca rápida
CREATE INDEX idx_users_whatsapp ON users(whatsapp_number);
```

## ⚠️ Importante

### Em Produção
- Use **Redis** para armazenar códigos OTP (não Map em memória)
- Use **Redis** para rate limiting (não Map em memória)
- Configure **WHATSAPP_WEBHOOK_SECRET** para validação HMAC
- Monitore tentativas de uso não autorizado

### Melhorias Futuras
- [ ] Verificação de número via SMS como alternativa
- [ ] Logs de segurança para auditoria
- [ ] Alertas para tentativas suspeitas
- [ ] Blacklist de números bloqueados
- [ ] Verificação de número via API externa

## 📊 Fluxo de Segurança

```
Mensagem WhatsApp
    ↓
Rate Limit Check
    ↓
Busca Usuário Vinculado
    ↓
┌─────────────────┐
│ Usuário Encontrado? │
└─────────────────┘
    ↓              ↓
   SIM            NÃO
    ↓              ↓
Processa      Bloqueia
Mensagem      + Mensagem
```

## ✅ Checklist de Segurança

- [x] Bloqueio de uso não autorizado
- [x] Verificação OTP
- [x] Validação de números duplicados
- [x] Rate limiting
- [x] Validações de formato
- [x] Constraints no banco de dados
- [x] Mensagens informativas
- [ ] Logs de segurança (futuro)
- [ ] Monitoramento de tentativas (futuro)
