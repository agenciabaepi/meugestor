# ✅ Checklist: Ativar Cron de Lembretes na Vercel

## 📋 Verificações Necessárias

### 1. ✅ Configuração do `vercel.json`
```json
{
  "framework": "nextjs",
  "crons": [
    {
      "path": "/api/cron/lembretes",
      "schedule": "*/5 * * * *"
    }
  ]
}
```
**Status**: ✅ Configurado corretamente

### 2. ✅ Rota do Cron
- **Arquivo**: `app/api/cron/lembretes/route.ts`
- **Export**: `export const dynamic = 'force-dynamic'` ✅
- **Métodos**: GET e POST ✅

**Status**: ✅ Configurado corretamente

### 3. ⚠️ Variável de Ambiente (Opcional mas Recomendado)

Se você configurou `CRON_SECRET` nas variáveis de ambiente:

1. Vercel Dashboard > **Settings > Environment Variables**
2. Verifique se existe:
   - `CRON_SECRET` (com um valor secreto)
3. Se não existir, adicione:
   - **Key**: `CRON_SECRET`
   - **Value**: (gere um token secreto, ex: `meu_token_secreto_123`)
   - **Environments**: Production, Preview, Development

**Importante**: Se você adicionar o `CRON_SECRET`, o cron do Vercel automaticamente enviará no header `Authorization: Bearer {CRON_SECRET}`. Nossa rota já está preparada para isso.

### 4. 🔴 ATIVAR O CRON NO DASHBOARD (CRÍTICO)

**Este é o passo mais importante!**

1. Acesse: [Vercel Dashboard](https://vercel.com/dashboard)
2. Selecione seu projeto
3. Vá em **Settings > Cron Jobs**
4. **Verifique se aparece o cron:**
   - Path: `/api/cron/lembretes`
   - Schedule: `*/5 * * * *`
   - Status: Deve estar **Ativo**

### 5. Se o Cron NÃO Aparecer Automaticamente:

1. No Vercel Dashboard > **Settings > Cron Jobs**
2. Clique em **"Add Cron Job"** ou **"Create Cron Job"**
3. Configure:
   - **Path**: `/api/cron/lembretes`
   - **Schedule**: `*/5 * * * *` (a cada 5 minutos)
   - **Method**: POST (ou deixe vazio)
4. Clique em **Save**

### 6. ✅ Verificar se Está Funcionando

#### Opção 1: Verificar Logs
1. Vercel Dashboard > **Logs**
2. Filtre por: `cron` ou `lembretes`
3. Procure por:
   - `=== CRON LEMBRETES INICIADO ===`
   - `=== PROCESSAR LEMBRETES INICIADO ===`

#### Opção 2: Testar Manualmente na Produção
Acesse: `https://seu-dominio.vercel.app/api/cron/lembretes`

Deve retornar um JSON com o resultado.

#### Opção 3: Verificar Histórico de Execuções
1. Vercel Dashboard > **Settings > Cron Jobs**
2. Clique no cron job
3. Veja o histórico de execuções (se disponível)

## 🐛 Problemas Comuns

### ❌ Cron não aparece no Dashboard
**Causa**: Pode não ter sido detectado automaticamente após o deploy
**Solução**: Adicione manualmente conforme passo 5

### ❌ Cron aparece mas não executa
**Causa**: Pode haver erro na rota ou falta de variáveis de ambiente
**Solução**: 
- Verifique os logs para erros
- Teste manualmente via GET/POST
- Verifique se todas as variáveis de ambiente estão configuradas

### ❌ Cron executa mas retorna erro 401
**Causa**: `CRON_SECRET` configurado mas não correspondendo
**Solução**: 
- Verifique se o `CRON_SECRET` na Vercel corresponde ao esperado
- Ou remova a verificação temporariamente para testar

### ❌ Cron executa mas não encontra compromissos
**Causa**: Não há compromissos nas próximas 2 horas ou já foram lembrados
**Solução**: 
- Verifique os logs detalhados
- Confirme que há compromissos futuros no banco
- Verifique se os campos `reminder_*_sent` existem

## 📝 Notas Importantes

1. **O cron só funciona em PRODUÇÃO**, não funciona localmente
2. No plano **Hobby** (gratuito), os crons podem ter delay de até 1 hora
3. O cron roda em **UTC**, então `*/5 * * * *` significa a cada 5 minutos em UTC
4. Para execuções mais precisas, considere upgrade para plano Pro

## ✅ Checklist Final

- [ ] `vercel.json` configurado com cron
- [ ] Rota `/api/cron/lembretes` existe e está funcionando
- [ ] `export const dynamic = 'force-dynamic'` na rota
- [ ] Deploy feito na Vercel
- [ ] Cron aparece em **Settings > Cron Jobs**
- [ ] Status do cron está "Ativo"
- [ ] Logs mostram execuções do cron
- [ ] Teste manual retorna sucesso
- [ ] (Opcional) `CRON_SECRET` configurado nas variáveis de ambiente
