# 🚀 Projeto Vercel

## 📍 Informações do Projeto

- **URL do Projeto**: https://vercel.com/rhema-gestaos-projects/meugestor
- **Repositório GitHub**: https://github.com/agenciabaepi/meugestor.git
- **Team**: rhema-gestaos-projects

## 🔧 Configurações Importantes

### Variáveis de Ambiente Necessárias

Configure as seguintes variáveis no painel da Vercel:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# OpenAI
OPENAI_API_KEY=your_openai_key
OPENAI_MODEL=gpt-5.2

# WhatsApp Business API
WHATSAPP_ACCESS_TOKEN=<WHATSAPP_ACCESS_TOKEN>
WHATSAPP_PHONE_NUMBER_ID=783032591562273
WHATSAPP_BUSINESS_ACCOUNT_ID=1940948953356904
WHATSAPP_APP_ID=1342089140921867
WHATSAPP_VERIFY_TOKEN=<WHATSAPP_VERIFY_TOKEN>
WHATSAPP_WEBHOOK_SECRET= (opcional)

# Cron (Opcional)
CRON_SECRET=your_cron_secret

# App URL (será gerado automaticamente pela Vercel)
NEXT_PUBLIC_APP_URL=https://meugestor.vercel.app
```

### Webhook do WhatsApp

Após o deploy, configure o webhook no Meta for Developers:

- **Callback URL**: `https://meugestor.vercel.app/api/whatsapp/webhook`
- **Verify Token**: `093718`

### Cron Jobs

O arquivo `vercel.json` já está configurado com:
- **Path**: `/api/cron/lembretes`
- **Schedule**: `0 * * * *` (a cada hora)

## 🔗 Links Úteis

- [Dashboard Vercel](https://vercel.com/rhema-gestaos-projects/meugestor)
- [Deployments](https://vercel.com/rhema-gestaos-projects/meugestor/deployments)
- [Settings](https://vercel.com/rhema-gestaos-projects/meugestor/settings)
- [Environment Variables](https://vercel.com/rhema-gestaos-projects/meugestor/settings/environment-variables)

## 📝 Próximos Passos

1. ✅ Repositório conectado ao GitHub
2. ⏳ Configurar variáveis de ambiente na Vercel
3. ⏳ Fazer deploy inicial
4. ⏳ Configurar webhook do WhatsApp
5. ⏳ Testar todas as funcionalidades
