# 🚀 Guia de Deploy - Meu Gestor

## 📋 Checklist de Deploy

### 1. Preparação

- [x] Código completo e testado
- [x] Variáveis de ambiente documentadas
- [x] Migrations SQL prontas
- [ ] Testes locais realizados

### 2. Deploy na Vercel

#### Passo 1: Conectar Repositório
1. Acesse [Vercel](https://vercel.com)
2. Conecte seu repositório GitHub
3. Selecione o projeto "Meu Gestor"

#### Passo 2: Configurar Variáveis de Ambiente
No painel da Vercel, adicione todas as variáveis:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xdbemrfnijvdheteuvbn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

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

#### Passo 3: Deploy
1. Clique em "Deploy"
2. Aguarde o build completar
3. Anote a URL gerada (ex: `https://meu-gestor.vercel.app`)

### 3. Configurar WhatsApp Webhook

1. Acesse [Meta for Developers](https://developers.facebook.com/)
2. Vá em **WhatsApp > Configuration**
3. Em **Webhook**, clique em **Edit**
4. Configure:
   - **Callback URL**: `https://seu-dominio.vercel.app/api/whatsapp/webhook`
   - **Verify Token**: (mesmo valor de `WHATSAPP_VERIFY_TOKEN`)
   - **Webhook fields**: Marque `messages`
5. Salve e verifique

### 4. Verificar Cron Jobs

O arquivo `vercel.json` já está configurado. Após o deploy:
1. Acesse **Settings > Cron Jobs** na Vercel
2. Verifique se o cron está ativo:
   - Path: `/api/cron/lembretes`
   - Schedule: `0 * * * *` (a cada hora)

### 5. Testar Sistema

#### Teste 1: Health Check
```bash
curl https://seu-dominio.vercel.app/api/health
```

#### Teste 2: Webhook WhatsApp
Envie uma mensagem para o número do WhatsApp Business e verifique os logs.

#### Teste 3: Dashboard
Acesse: `https://seu-dominio.vercel.app/dashboard`

#### Teste 4: Cron Job
```bash
curl -X POST https://seu-dominio.vercel.app/api/cron/lembretes \
  -H "Authorization: Bearer seu_cron_secret"
```

## 🔧 Troubleshooting

### Problema: Webhook não recebe mensagens
- Verifique se a URL está correta
- Verifique se o Verify Token está correto
- Verifique os logs da Vercel

### Problema: Erro 401 no cron
- Verifique se `CRON_SECRET` está configurado
- Verifique o header `Authorization: Bearer ...`

### Problema: Erro de conexão com Supabase
- Verifique as variáveis de ambiente
- Verifique se as migrations foram aplicadas
- Verifique os logs da Vercel

## 📊 Monitoramento

### Logs da Vercel
- Acesse o dashboard da Vercel
- Vá em **Logs** para ver erros em tempo real

### Logs do Supabase
- Acesse o dashboard do Supabase
- Vá em **Logs** para ver queries e erros

### Métricas
- Use `/api/usage/stats` para ver estatísticas de uso
- Monitore custos via `usage_logs` no Supabase

## 🎯 Próximos Passos Após Deploy

1. **Testar todas as funcionalidades**
2. **Monitorar custos** (OpenAI, WhatsApp)
3. **Ajustar rate limits** se necessário
4. **Configurar domínio customizado** (opcional)
5. **Implementar autenticação completa** (futuro)

## ✅ Deploy Completo!

Após seguir este guia, seu sistema estará:
- ✅ Online e acessível
- ✅ Recebendo mensagens do WhatsApp
- ✅ Processando com IA
- ✅ Enviando lembretes automaticamente
- ✅ Dashboard funcionando
