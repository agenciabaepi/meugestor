# 🚀 Deploy Rápido - ORGANIZAPAY

## ✅ Checklist Pré-Deploy

### 1. Migrations do Banco de Dados
Certifique-se de aplicar todas as migrations no Supabase:

```sql
-- Execute no Supabase SQL Editor na ordem:
1. 001_initial_schema.sql
2. 002_rls_policies.sql
3. 003_create_storage_bucket.sql
4. 004_security_and_plans.sql
5. 005_financeiro_metadata.sql
6. 006_auth_integration.sql
7. 007_financeiro_categories.sql
8. 008_financeiro_type.sql
9. 009_multiple_reminders.sql ⚠️ IMPORTANTE - Sistema de lembretes múltiplos
10. 010_fix_handle_new_user_use_existing_tenant.sql
```

### 2. Variáveis de Ambiente na Vercel

Configure todas as variáveis no painel da Vercel (Settings > Environment Variables):

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anon
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role

# OpenAI
OPENAI_API_KEY=sk-proj-...
OPENAI_MODEL=gpt-4o

# WhatsApp
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_ACCESS_TOKEN=...
WHATSAPP_VERIFY_TOKEN=...
WHATSAPP_WEBHOOK_SECRET=...

# Cron (Opcional)
CRON_SECRET=seu_token_secreto

# App
NEXT_PUBLIC_APP_URL=https://seu-dominio.vercel.app
```

## 🚀 Passos para Deploy

### Opção 1: Deploy via Vercel Dashboard

1. **Push para o repositório:**
   ```bash
   git push origin main
   ```

2. **Na Vercel:**
   - Acesse [vercel.com](https://vercel.com)
   - Selecione seu projeto
   - O deploy será automático após o push

### Opção 2: Deploy via Vercel CLI

```bash
# Instalar Vercel CLI (se ainda não tiver)
npm i -g vercel

# Fazer login
vercel login

# Deploy
vercel --prod
```

## ⚙️ Pós-Deploy

### 1. Atualizar Webhook do WhatsApp

1. Acesse [Meta for Developers](https://developers.facebook.com/)
2. Vá em **WhatsApp > Configuration**
3. Atualize o **Callback URL** para: `https://seu-dominio.vercel.app/api/whatsapp/webhook`
4. Verifique o webhook

### 2. Configurar Cron Jobs (Lembretes)

1. Na Vercel, vá em **Settings > Cron Jobs**
2. Adicione um novo cron:
   - **Path**: `/api/cron/lembretes`
   - **Schedule**: `*/5 * * * *` (a cada 5 minutos)
   - **Authorization**: Bearer token (use `CRON_SECRET`)

### 3. Testar

```bash
# Health check
curl https://seu-dominio.vercel.app/api/health

# Teste de cron (se configurado)
curl -X POST https://seu-dominio.vercel.app/api/cron/lembretes \
  -H "Authorization: Bearer seu_cron_secret"
```

## ⚠️ Importante

- ✅ Certifique-se de que a migration `009_multiple_reminders.sql` foi aplicada
- ✅ Configure todas as variáveis de ambiente na Vercel
- ✅ Atualize o webhook do WhatsApp com a URL de produção
- ✅ Teste o sistema após o deploy

## 📊 Monitoramento

Após o deploy, monitore:
- Logs da Vercel (Dashboard > Logs)
- Logs do Supabase (Dashboard > Logs)
- Custos da OpenAI (via `usage_logs`)
