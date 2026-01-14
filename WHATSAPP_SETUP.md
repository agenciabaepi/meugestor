# 📱 Configuração do WhatsApp Business API

## ✅ Implementação Concluída

A integração com WhatsApp Business API foi implementada com sucesso!

## 📋 Arquivos Criados

1. **`lib/modules/whatsapp.ts`** - Módulo principal de integração
   - Validação de webhook
   - Envio de mensagens
   - Download de mídias
   - Utilitários

2. **`app/api/whatsapp/webhook/route.ts`** - Webhook para receber mensagens
   - GET: Verificação do webhook
   - POST: Processamento de mensagens recebidas

3. **`app/api/whatsapp/send/route.ts`** - API para enviar mensagens

## 🔧 Variáveis de Ambiente Necessárias

Adicione as seguintes variáveis ao seu `.env.local`:

```env
# WhatsApp Business API Configuration
WHATSAPP_ACCESS_TOKEN=EAATEn3qAZAgsBP5HQQSkKmw3QBHgkVfcCPgcwUTrBBb9J5EIDKHgLAubfQV6B0Ng0rF4I7ba56DS6C7ChIiXpVZA1DDJ4dD9ZC5h8UtdzJGHIbZBIS3LiSE5f1PkYbdZAJlJZAOntZA4ZCI1I9CIAJ6p3bYt6KEmZBlNM3gOMf248gBktGLQ7JfidKLKQbulXGnZCfBFPYGU0yzWrpsSZCnMtHGdZAFudEUlmclvKZBsH
WHATSAPP_PHONE_NUMBER_ID=783032591562273
WHATSAPP_BUSINESS_ACCOUNT_ID=1940948953356904
WHATSAPP_APP_ID=1342089140921867
WHATSAPP_VERIFY_TOKEN=093718
WHATSAPP_WEBHOOK_SECRET= (opcional, para validação HMAC)
```

**✅ Credenciais confirmadas do projeto anterior**

## 🔗 Configuração no Meta for Developers

### 1. Criar Webhook

1. Acesse [Meta for Developers](https://developers.facebook.com/)
2. Vá em **WhatsApp > Configuration**
3. Em **Webhook**, clique em **Edit**
4. Configure:
   - **Callback URL**: `https://seu-dominio.com/api/whatsapp/webhook`
   - **Verify Token**: `093718` (mesmo valor de `WHATSAPP_VERIFY_TOKEN` no `.env.local`)
   - **Webhook fields**: Marque `messages`

### 2. Obter Credenciais

1. **Phone Number ID**: Encontrado em **WhatsApp > API Setup**
2. **Access Token**: Token temporário ou permanente (recomendado: permanente)
3. **Verify Token**: Crie um token personalizado e seguro
4. **Webhook Secret**: Opcional, mas recomendado para produção

## 🧪 Testando o Webhook

### Verificação Inicial

Quando você configurar o webhook no Meta, o sistema automaticamente:
1. Recebe a requisição GET de verificação
2. Valida o token
3. Retorna o challenge

### Teste de Mensagem

1. Envie uma mensagem para o número do WhatsApp Business
2. O webhook receberá a mensagem em `/api/whatsapp/webhook`
3. A mensagem será salva na tabela `conversations`
4. O tenant será identificado/criado automaticamente

## 📝 Fluxo de Processamento

1. **Mensagem recebida** → Webhook `/api/whatsapp/webhook`
2. **Validação** → Assinatura e token verificados
3. **Identificação de Tenant** → Pelo `phone_number_id`
4. **Salvamento** → Mensagem salva em `conversations`
5. **Processamento** → Será implementado na ETAPA 6 (IA Conversacional)

## 🚀 Enviar Mensagem via API

```bash
curl -X POST http://localhost:3000/api/whatsapp/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "5511999999999",
    "message": "Olá! Esta é uma mensagem de teste."
  }'
```

## ⚠️ Notas Importantes

1. **Rate Limits**: O WhatsApp tem limites de mensagens por segundo
2. **24h Window**: Você só pode responder mensagens dentro de 24h após recebê-las
3. **Template Messages**: Para mensagens fora da janela de 24h, use templates aprovados
4. **Webhook Secret**: Em produção, sempre use validação HMAC

## 🔐 Segurança

- ✅ Validação de token de verificação
- ✅ Validação de assinatura HMAC (se configurada)
- ✅ Sanitização de números de telefone
- ✅ Tratamento de erros robusto

## 📚 Próximos Passos

A ETAPA 6 implementará o processamento de mensagens com IA (GPT-4o) para gerar respostas inteligentes.
