# 📱 Análise: Configurações WhatsApp do Projeto Anterior

## 🔑 Credenciais Confirmadas

### Credenciais do WhatsApp Business API (CONFIRMADAS)

```env
# WhatsApp Business API Configuration
WHATSAPP_ACCESS_TOKEN=<WHATSAPP_ACCESS_TOKEN>
WHATSAPP_PHONE_NUMBER_ID=783032591562273
WHATSAPP_BUSINESS_ACCOUNT_ID=1940948953356904
WHATSAPP_APP_ID=1342089140921867
WHATSAPP_VERIFY_TOKEN=<WHATSAPP_VERIFY_TOKEN>
```

**✅ Todas as credenciais foram confirmadas pelo usuário.**

## 🔧 Configuração do Webhook

### URL do Webhook
```
https://gestaoconsert.com.br/api/webhook
```
ou para Vercel:
```
https://seu-app.vercel.app/api/webhook
```

### Token de Verificação
```
WHATSAPP_VERIFY_TOKEN=<WHATSAPP_VERIFY_TOKEN>
```

### Endpoint da API
O webhook está implementado em:
```
/src/app/api/webhook/route.ts
```

### Estrutura do Webhook

#### GET - Verificação do Webhook
- **Parâmetros esperados:**
  - `hub.mode` = "subscribe"
  - `hub.verify_token` = valor de `WHATSAPP_VERIFY_TOKEN`
  - `hub.challenge` = código de verificação do Meta

- **Resposta:** Retorna o `hub.challenge` se o token estiver correto

#### POST - Recebimento de Mensagens
- **Validações implementadas:**
  - Ignora mensagens de status (delivered, read, etc)
  - Ignora atualizações de contato
  - Ignora mensagens enviadas pelo próprio sistema (com `context`)
  - Ignora mensagens muito antigas (>5 minutos)
  - Processa apenas mensagens de texto recebidas

- **Fluxo de processamento:**
  1. Recebe mensagem do WhatsApp
  2. Verifica se usuário está cadastrado
  3. Processa comandos especiais (`/comissoes`, senha de OS)
  4. Se não for comando, usa ChatGPT para responder
  5. Envia resposta via WhatsApp API

## 📡 API do Facebook Graph

### Versão da API
O projeto usa principalmente:
- **v18.0** - Para envio de mensagens e verificações
- **v19.0** - Em alguns endpoints de teste

### URL Base
```
https://graph.facebook.com/v18.0/{PHONE_NUMBER_ID}/messages
```

### Headers Necessários
```javascript
{
  'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
  'Content-Type': 'application/json'
}
```

### Estrutura de Envio de Mensagem
```javascript
{
  messaging_product: 'whatsapp',
  to: '5511999999999', // Número com código do país (55 para Brasil)
  type: 'text',
  text: {
    body: 'Mensagem de texto'
  }
}
```

### Normalização de Números
O sistema normaliza números de telefone:
- Remove caracteres não numéricos
- Adiciona código do país (55) se não tiver
- Formato final: `55XXXXXXXXXXX`

## 🏗️ Estrutura de Implementação

### Arquivos Principais

1. **`/src/app/api/webhook/route.ts`**
   - Handler principal do webhook
   - GET: Verificação
   - POST: Processamento de mensagens

2. **Funções de Processamento:**
   - `processWhatsAppMessage()` - Processa mensagens recebidas
   - `sendWhatsAppTextMessage()` - Envia mensagens via API

3. **Comandos Especiais:**
   - `/comissoes` - Para técnicos verem suas comissões
   - Consulta de senha de OS (ex: "qual a senha da os 890")
   - Integração com ChatGPT para outras mensagens

### Segurança Implementada

1. **Verificação de Usuário:**
   - Apenas números cadastrados podem usar o bot
   - Verificação por `getUsuarioByWhatsApp()`

2. **Controle de Acesso:**
   - Comandos específicos por nível de usuário
   - Técnicos só veem OS atribuídas a eles

3. **Validação de Webhook:**
   - Verificação de token no GET
   - Validação de estrutura no POST

## 📋 Checklist para Migração

### Variáveis de Ambiente Necessárias
```env
# WhatsApp Business API Configuration
WHATSAPP_ACCESS_TOKEN=<WHATSAPP_ACCESS_TOKEN>
WHATSAPP_PHONE_NUMBER_ID=783032591562273
WHATSAPP_BUSINESS_ACCOUNT_ID=1940948953356904
WHATSAPP_APP_ID=1342089140921867
WHATSAPP_VERIFY_TOKEN=<WHATSAPP_VERIFY_TOKEN>
WHATSAPP_WEBHOOK_SECRET= (opcional, para validação HMAC)
```

### Configuração no Meta for Developers

1. **Acesse:** [Meta for Developers](https://developers.facebook.com/)
2. **Navegue:** WhatsApp → Configuração → Webhook
3. **Configure:**
   - **Callback URL:** `https://seu-dominio.com/api/webhook`
   - **Verify Token:** `093718`
   - **Webhook fields:** Marque `messages`

### Endpoints da API

- **Webhook:** `/api/webhook`
  - GET: Verificação
  - POST: Recebimento de mensagens

- **Envio de Mensagens:** Direto via `sendWhatsAppTextMessage()` usando a API do Facebook Graph

## 🔍 Observações Importantes

1. **Versão da API:** O projeto usa v18.0 principalmente, mas alguns testes usam v19.0
2. **Normalização:** Sempre normaliza números para formato internacional (55 + número)
3. **Validações:** Múltiplas validações para evitar processar mensagens duplicadas ou inválidas
4. **Integração ChatGPT:** Usa OpenAI para responder mensagens que não são comandos
5. **Multi-tenant:** O sistema identifica usuários por número de WhatsApp e controla acesso por nível

## 📝 Próximos Passos

1. ✅ Copiar credenciais para o novo projeto
2. ✅ Configurar variáveis de ambiente
3. ✅ Implementar endpoint `/api/webhook` similar
4. ✅ Configurar webhook no Meta for Developers
5. ✅ Testar recebimento e envio de mensagens
