# 🔗 URL do Webhook - Configuração

## ✅ URL do Projeto na Vercel

```
https://meugestor-six.vercel.app
```

## 📋 URL Completa do Webhook

Use esta URL no campo **"URL de callback"** no Meta for Developers:

```
https://meugestor-six.vercel.app/api/whatsapp/webhook
```

## 🔑 Verify Token

Use este token no campo **"Verificar token"** no Meta for Developers:

```
093718
```

## 📝 Configuração Completa

### No Meta for Developers:

1. **URL de callback**: 
   ```
   https://meugestor-six.vercel.app/api/whatsapp/webhook
   ```

2. **Verificar token**: 
   ```
   093718
   ```

3. **Campos do Webhook** (marque):
   - ✅ `messages`
   - ✅ `message_status`

4. Clique em **"Verificar e salvar"**

## ✅ Após Configurar

Após salvar, o Meta vai:
1. Fazer uma requisição GET para verificar o webhook
2. Se tudo estiver correto, o webhook será ativado
3. Você poderá receber mensagens do WhatsApp

## 🧪 Teste

Após configurar, envie uma mensagem para o número do WhatsApp Business configurado. A mensagem deve ser recebida e processada pelo sistema.

---

**💡 Dica**: Você pode acessar `/webhook-config` no seu projeto para ver essas informações formatadas e copiar facilmente!
