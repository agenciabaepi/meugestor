# 🔑 Credenciais WhatsApp Business API

## ✅ Credenciais Confirmadas

Estas são as credenciais do WhatsApp Business API que serão utilizadas no projeto:

```env
# WhatsApp Business API Configuration
WHATSAPP_ACCESS_TOKEN=EAATEn3qAZAgsBP5HQQSkKmw3QBHgkVfcCPgcwUTrBBb9J5EIDKHgLAubfQV6B0Ng0rF4I7ba56DS6C7ChIiXpVZA1DDJ4dD9ZC5h8UtdzJGHIbZBIS3LiSE5f1PkYbdZAJlJZAOntZA4ZCI1I9CIAJ6p3bYt6KEmZBlNM3gOMf248gBktGLQ7JfidKLKQbulXGnZCfBFPYGU0yzWrpsSZCnMtHGdZAFudEUlmclvKZBsH
WHATSAPP_PHONE_NUMBER_ID=783032591562273
WHATSAPP_BUSINESS_ACCOUNT_ID=1940948953356904
WHATSAPP_APP_ID=1342089140921867
WHATSAPP_VERIFY_TOKEN=093718
```

## 📋 Informações Adicionais

- **API Version**: v21.0 (configurado em `lib/modules/whatsapp.ts`)
- **Webhook URL**: `/api/whatsapp/webhook`
- **Verify Token**: `093718` (usado na configuração do webhook no Meta)

## 🔧 Como Usar

1. Adicione essas variáveis ao seu arquivo `.env.local`
2. Configure o webhook no Meta for Developers:
   - URL: `https://seu-dominio.com/api/whatsapp/webhook`
   - Verify Token: `093718`
3. O sistema já está preparado para usar essas credenciais

## ⚠️ Importante

- Mantenha essas credenciais seguras
- Não commite o arquivo `.env.local` no Git
- Em produção, configure essas variáveis no painel da Vercel (ou seu provedor)
