# ✅ Checklist de Deploy - Meu Gestor

## 📋 Antes do Deploy

### 1. Código
- [x] Todas as etapas implementadas
- [x] Sem erros de linter
- [x] Código testado localmente
- [ ] Testes manuais realizados

### 2. Variáveis de Ambiente
- [ ] `NEXT_PUBLIC_SUPABASE_URL` configurado
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` configurado
- [ ] `SUPABASE_SERVICE_ROLE_KEY` configurado
- [ ] `OPENAI_API_KEY` configurado
- [ ] `OPENAI_MODEL` configurado (gpt-4o)
- [ ] `WHATSAPP_PHONE_NUMBER_ID` configurado
- [ ] `WHATSAPP_ACCESS_TOKEN` configurado
- [ ] `WHATSAPP_VERIFY_TOKEN` configurado
- [ ] `WHATSAPP_WEBHOOK_SECRET` configurado (opcional)
- [ ] `CRON_SECRET` configurado (opcional)
- [ ] `NEXT_PUBLIC_APP_URL` configurado (URL de produção)

### 3. Banco de Dados
- [ ] Migrations aplicadas no Supabase
- [ ] Tabelas criadas
- [ ] RLS habilitado
- [ ] Bucket `receipts` criado
- [ ] Teste de conexão realizado

### 4. WhatsApp
- [ ] Webhook configurado no Meta for Developers
- [ ] URL do webhook aponta para produção
- [ ] Verify Token configurado
- [ ] Teste de verificação realizado

## 🚀 Deploy

### 1. Vercel
- [ ] Repositório conectado
- [ ] Variáveis de ambiente configuradas
- [ ] Deploy realizado
- [ ] URL de produção anotada

### 2. Webhook WhatsApp
- [ ] URL atualizada no Meta for Developers
- [ ] Webhook verificado
- [ ] Teste de mensagem realizado

### 3. Cron Jobs
- [ ] Verificar se está ativo na Vercel
- [ ] Teste manual realizado
- [ ] Logs verificados

## ✅ Pós-Deploy

### 1. Testes
- [ ] Health check funciona
- [ ] Dashboard carrega
- [ ] Webhook recebe mensagens
- [ ] IA processa mensagens
- [ ] Áudios são transcritos
- [ ] Imagens são processadas
- [ ] Lembretes são enviados

### 2. Monitoramento
- [ ] Logs da Vercel verificados
- [ ] Logs do Supabase verificados
- [ ] Custos monitorados
- [ ] Performance verificada

## 🎯 Pronto!

Após completar este checklist, seu sistema estará:
- ✅ Online e acessível
- ✅ Recebendo mensagens
- ✅ Processando com IA
- ✅ Funcionando completamente
