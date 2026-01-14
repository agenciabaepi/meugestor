# 🔒 Segurança, Custo e Planos

## ✅ Implementação Concluída

O sistema de segurança, controle de custos e estrutura para planos foi implementado!

## 📋 Arquivos Criados

1. **`lib/utils/rate-limit.ts`** - Sistema de rate limiting
   - Limita requisições por período
   - Store em memória (pode ser migrado para Redis)

2. **`lib/utils/cost-tracker.ts`** - Controle de custos
   - Cálculo de custos por serviço
   - Registro de uso no banco
   - Consulta de estatísticas

3. **`lib/utils/security.ts`** - Utilitários de segurança
   - Sanitização de inputs
   - Validações
   - Geração de tokens seguros

4. **`app/api/usage/stats/route.ts`** - API de estatísticas de uso

## 🗄️ Tabelas Criadas

### usage_logs
Registra todos os usos de serviços:
- `tenant_id` - ID do tenant
- `service` - Serviço usado (openai, whisper, vision, whatsapp)
- `tokens_used` - Tokens utilizados
- `cost` - Custo em USD
- `metadata` - Dados adicionais (JSONB)
- `created_at` - Timestamp

### plans
Estrutura para planos futuros:
- `name` - Nome do plano (slug)
- `display_name` - Nome de exibição
- `price_monthly` - Preço mensal
- `max_messages_per_month` - Limite de mensagens
- `max_tokens_per_month` - Limite de tokens
- `features` - Features do plano (JSONB)

### subscriptions
Assinaturas dos tenants:
- `tenant_id` - ID do tenant
- `plan_id` - ID do plano
- `status` - Status (active, canceled, expired, trial)
- `current_period_start` - Início do período
- `current_period_end` - Fim do período

## 💰 Preços Configurados

### OpenAI
- **GPT-4o**: $0.0025/1K input, $0.01/1K output
- **GPT-4 Turbo**: $0.01/1K input, $0.03/1K output
- **GPT-3.5 Turbo**: $0.0005/1K input, $0.0015/1K output

### Whisper
- **$0.006 por minuto** de áudio

### Vision
- **$0.01 por imagem** processada

### WhatsApp
- **$0.005 por mensagem** (estimado)

## 📊 Controle de Custos

### Registro Automático
Todos os serviços registram uso automaticamente:
- ✅ Chamadas OpenAI (tokens e custo)
- ✅ Transcrições Whisper (minutos e custo)
- ✅ Processamento Vision (imagens e custo)
- ⏳ WhatsApp (pode ser adicionado)

### Consulta de Estatísticas
```typescript
// Custo do mês
const custoMes = await getTenantCost(tenantId, startOfMonth)

// Tokens usados
const tokens = await getTenantTokenUsage(tenantId, startOfMonth)
```

## 🛡️ Segurança

### Rate Limiting
- **Padrão**: 100 requisições por hora
- Configurável por endpoint
- Store em memória (pode usar Redis em produção)

### Validações
- ✅ Sanitização de inputs
- ✅ Validação de email
- ✅ Validação de telefone
- ✅ Validação de valores numéricos
- ✅ Validação HMAC para webhooks

### Autenticação
- ✅ Validação de tokens de webhook
- ✅ Validação de assinaturas HMAC
- ⏳ Autenticação de usuários (futuro)

## 📈 Estrutura para Planos

### Planos Pré-definidos (Futuro)
```sql
-- Exemplo de planos
INSERT INTO plans (name, display_name, price_monthly, max_messages_per_month, max_tokens_per_month)
VALUES
  ('free', 'Gratuito', 0, 100, 10000),
  ('pro', 'Profissional', 29.90, 1000, 100000),
  ('enterprise', 'Empresarial', 99.90, NULL, NULL);
```

### Limites por Plano
- **Free**: Limites básicos
- **Pro**: Limites maiores
- **Enterprise**: Ilimitado

## 🔧 Configuração

### Variáveis de Ambiente

```env
# Token para cron jobs (opcional)
CRON_SECRET=seu_token_secreto

# Rate limiting (pode ser configurado por endpoint)
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=3600000
```

## 📊 API de Estatísticas

### GET /api/usage/stats

Retorna estatísticas de uso do tenant:

```json
{
  "tenantId": "uuid",
  "periodo": {
    "mes": {
      "custo": 0.15,
      "tokens": 5000
    },
    "total": {
      "custo": 1.50,
      "tokens": 50000
    }
  }
}
```

## 🚀 Melhorias Futuras

### Rate Limiting
- [ ] Migrar para Redis para produção
- [ ] Rate limiting por tenant
- [ ] Rate limiting por tipo de serviço

### Custos
- [ ] Alertas de custo alto
- [ ] Limites por plano
- [ ] Dashboard de custos

### Segurança
- [ ] Autenticação completa com Supabase Auth
- [ ] 2FA para admins
- [ ] Auditoria de ações

### Planos
- [ ] Implementar checkout
- [ ] Gerenciamento de assinaturas
- [ ] Downgrade/upgrade automático

## 📚 Documentação

- [OpenAI Pricing](https://openai.com/pricing)
- [WhatsApp Business API Pricing](https://developers.facebook.com/docs/whatsapp/pricing)
- [Supabase RLS](https://supabase.com/docs/guides/auth/row-level-security)
