# 🔍 Como Verificar e Ativar o Cron de Lembretes

## ⚠️ Problema: Cron não está gerando logs

Se o cron não está gerando logs, pode ser que:

1. **O cron não está ativo no Vercel**
2. **O cron está falhando silenciosamente**
3. **A migration não foi aplicada**

## ✅ Passo 1: Verificar se o Cron está Ativo

1. Acesse o [Vercel Dashboard](https://vercel.com/dashboard)
2. Selecione seu projeto
3. Vá em **Settings > Cron Jobs**
4. Verifique se aparece:
   - **Path**: `/api/cron/lembretes`
   - **Schedule**: `*/5 * * * *` (a cada 5 minutos)
   - **Status**: Ativo

Se não aparecer, o cron **não está configurado**. Siga o Passo 2.

## ✅ Passo 2: Ativar o Cron Manualmente

Se o cron não aparecer automaticamente:

1. No Vercel Dashboard, vá em **Settings > Cron Jobs**
2. Clique em **Add Cron Job**
3. Configure:
   - **Path**: `/api/cron/lembretes`
   - **Schedule**: `*/5 * * * *`
   - **Method**: POST (ou GET para teste)
4. Salve

## ✅ Passo 3: Testar Manualmente

Após o deploy, teste manualmente:

### Opção 1: Via Browser
Acesse: `https://seu-dominio.vercel.app/api/cron/lembretes`

### Opção 2: Via cURL
```bash
curl https://seu-dominio.vercel.app/api/cron/lembretes
```

### Opção 3: Via Vercel Dashboard
1. Vá em **Settings > Cron Jobs**
2. Clique no cron job
3. Clique em **Run Now** (se disponível)

## ✅ Passo 4: Verificar Logs

1. No Vercel Dashboard, vá em **Logs**
2. Filtre por: `cron` ou `lembretes`
3. Procure por:
   - `=== CRON LEMBRETES INICIADO ===`
   - `=== PROCESSAR LEMBRETES INICIADO ===`
   - `Encontrados X tenant(s)`

## ✅ Passo 5: Verificar Migration

Certifique-se de que a migration `009_multiple_reminders.sql` foi aplicada:

1. Acesse o Supabase Dashboard
2. Vá em **SQL Editor**
3. Execute:
```sql
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'compromissos' 
AND column_name LIKE 'reminder_%';
```

Deve retornar:
- `reminder_1h_sent`
- `reminder_30min_sent`
- `reminder_10min_sent`

Se não retornar, execute a migration `009_multiple_reminders.sql`.

## 🔧 Solução de Problemas

### Problema: Cron não aparece no Vercel

**Solução**: O cron do Vercel pode não ser ativado automaticamente. Adicione manualmente conforme Passo 2.

### Problema: Cron aparece mas não executa

**Solução**: 
1. Verifique se há erros nos logs
2. Teste manualmente via GET (Passo 3)
3. Verifique se `CRON_SECRET` está configurado (se configurado, o cron precisa enviar o header)

### Problema: Cron executa mas não encontra compromissos

**Solução**:
1. Verifique se há compromissos futuros no banco
2. Verifique se os campos `reminder_*_sent` existem (Passo 5)
3. Verifique os logs para ver quais compromissos estão sendo verificados

### Problema: Cron executa mas não envia mensagens

**Solução**:
1. Verifique se o WhatsApp está configurado corretamente
2. Verifique se o número do WhatsApp está no campo `whatsapp_number` da tabela `tenants`
3. Verifique os logs para ver se há erros no envio

## 📊 Exemplo de Logs Esperados

Quando funcionando corretamente, você deve ver:

```
=== CRON LEMBRETES INICIADO ===
Timestamp: 2026-01-14T21:30:00.000Z
Horário Brasil: 14/01/2026, 18:30:00
Iniciando processamento de lembretes...

=== PROCESSAR LEMBRETES INICIADO ===
Validando configuração do Supabase...
✅ Supabase configurado. Buscando tenants...
✅ Encontrados 1 tenant(s)

=== Processando lembretes 10min (10min antes) ===
Horário atual: 14/01/2026, 18:30:00

Processando tenant: e0c7bcc6-c69a-47f3-ab81-1307449f62d8 (WhatsApp: 5512974046426)
buscarCompromissosParaLembrete - Verificando compromisso: {
  id: '...',
  title: 'Reunião',
  tipoLembrete: '10min',
  antecedenciaMinutos: 10,
  dataCompromisso: '14/01/2026, 18:40',
  agora: '14/01/2026, 18:30',
  diferencaMinutos: 10,
  dentroJanela: true
}
Encontrados 1 compromissos para lembrete 10min

Enviando lembrete 10min para compromisso: Reunião (ID: ...)
✅ Lembrete 10min enviado com sucesso

=== CRON LEMBRETES FINALIZADO ===
```

## 🚀 Próximos Passos

1. ✅ Verificar se o cron está ativo (Passo 1)
2. ✅ Testar manualmente (Passo 3)
3. ✅ Verificar logs (Passo 4)
4. ✅ Aplicar migration se necessário (Passo 5)
5. ✅ Agendar um compromisso de teste e aguardar
