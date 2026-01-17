# 🧪 Guia de Testes - ORGANIZAPAY

## 📋 Como Testar o Sistema

### 1. Testes Básicos

#### Health Check
```bash
curl http://localhost:3000/api/health
```
**Esperado**: `{"status":"ok","timestamp":"..."}`

#### Dashboard
Acesse: `http://localhost:3000/dashboard`
**Esperado**: Página carrega sem erros

### 2. Testes do WhatsApp

#### Teste de Verificação do Webhook
```bash
curl "http://localhost:3000/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=SEU_TOKEN&hub.challenge=123456"
```
**Esperado**: Retorna `123456` (o challenge)

#### Teste de Mensagem de Texto
Envie via WhatsApp: `"Gastei 50 reais de gasolina hoje"`
**Esperado**: Sistema registra o gasto e responde com confirmação

#### Teste de Áudio
Envie um áudio via WhatsApp dizendo: `"Tenho reunião amanhã às 10h"`
**Esperado**: Sistema transcreve, cria compromisso e confirma

#### Teste de Imagem
Envie uma foto de comprovante via WhatsApp
**Esperado**: Sistema extrai dados e pede confirmação

### 3. Testes da IA

#### Teste de Conversação
Envie: `"Quanto gastei esse mês?"`
**Esperado**: Sistema consulta e retorna relatório

#### Teste de Registro Automático
Envie: `"Coloquei 30 reais de almoço"`
**Esperado**: Sistema registra automaticamente

### 4. Testes do Dashboard

#### Visão Geral
- Acesse `/dashboard`
- Verifique se os cards aparecem
- Verifique se os dados são exibidos

#### Financeiro
- Acesse `/dashboard/financeiro`
- Verifique se os gráficos aparecem
- Verifique se a lista de gastos aparece

#### Agenda
- Acesse `/dashboard/agenda`
- Verifique se os compromissos aparecem

### 5. Testes de Lembretes

#### Teste Manual do Cron
```bash
curl -X POST http://localhost:3000/api/cron/lembretes \
  -H "Authorization: Bearer seu_cron_secret"
```
**Esperado**: Retorna estatísticas de processamento

### 6. Testes de Segurança

#### Rate Limiting
Faça múltiplas requisições rapidamente
**Esperado**: Após o limite, retorna erro 429

#### Validação de Webhook
Envie requisição sem token válido
**Esperado**: Retorna 403 Forbidden

## 🐛 Problemas Comuns

### Erro: "Missing Supabase environment variables"
**Solução**: Verifique se `.env.local` está configurado

### Erro: "Table does not exist"
**Solução**: Execute as migrations no Supabase

### Erro: "Webhook verification failed"
**Solução**: Verifique `WHATSAPP_VERIFY_TOKEN`

### Erro: "OpenAI API error"
**Solução**: Verifique `OPENAI_API_KEY` e créditos

## ✅ Checklist de Testes

- [ ] Health check funciona
- [ ] Dashboard carrega
- [ ] Webhook verifica corretamente
- [ ] Mensagens de texto são processadas
- [ ] Áudios são transcritos
- [ ] Imagens são processadas
- [ ] Gastos são registrados
- [ ] Compromissos são criados
- [ ] Relatórios são gerados
- [ ] Lembretes são enviados
- [ ] Rate limiting funciona
- [ ] Logs de uso são registrados
