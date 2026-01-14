# ⏰ Como Ativar o Cron de Lembretes na Vercel

## ⚠️ Importante

**O cron do Vercel só funciona em PRODUÇÃO, não funciona localmente!**

Quando você acessa `http://localhost:3000/api/cron/lembretes`, está chamando manualmente. O cron automático só funciona na Vercel após o deploy.

## ✅ Passo 1: Verificar se o Cron está Configurado

O arquivo `vercel.json` já está configurado:

```json
{
  "crons": [
    {
      "path": "/api/cron/lembretes",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

Isso significa que o cron deve rodar **a cada 5 minutos**.

## ✅ Passo 2: Fazer Deploy na Vercel

1. Certifique-se de que todas as alterações foram commitadas e enviadas:
   ```bash
   git add -A
   git commit -m "feat: configura cron de lembretes"
   git push origin main
   ```

2. Aguarde o deploy completar na Vercel

## ✅ Passo 3: Ativar o Cron no Dashboard da Vercel

Após o deploy:

1. Acesse o [Vercel Dashboard](https://vercel.com/dashboard)
2. Selecione seu projeto
3. Vá em **Settings > Cron Jobs**
4. Verifique se aparece o cron:
   - **Path**: `/api/cron/lembretes`
   - **Schedule**: `*/5 * * * *` (a cada 5 minutos)
   - **Status**: Deve estar ativo

### Se o Cron NÃO Aparecer:

1. No Vercel Dashboard, vá em **Settings > Cron Jobs**
2. Clique em **"Add Cron Job"** ou **"Create Cron Job"**
3. Configure:
   - **Path**: `/api/cron/lembretes`
   - **Schedule**: `*/5 * * * *`
   - **Method**: POST (ou deixe vazio)
4. Salve

## ✅ Passo 4: Verificar se Está Funcionando

### Opção 1: Verificar Logs

1. No Vercel Dashboard, vá em **Logs**
2. Filtre por: `cron` ou `lembretes`
3. Procure por logs com:
   - `=== CRON LEMBRETES INICIADO ===`
   - `=== PROCESSAR LEMBRETES INICIADO ===`

### Opção 2: Testar Manualmente na Produção

Acesse: `https://seu-dominio.vercel.app/api/cron/lembretes`

Deve retornar um JSON com o resultado do processamento.

## ⚠️ Limitações do Plano Hobby

No plano **Hobby** (gratuito) da Vercel:
- Os crons podem ter um delay de até 1 hora
- Podem não executar exatamente no horário programado
- Há limite de execuções

**Solução**: Para execuções mais precisas, considere:
- Upgrade para plano Pro
- Usar um serviço externo de cron (cron-job.org, EasyCron, etc)

## 🔧 Alternativa: Cron Externo

Se o cron do Vercel não funcionar bem, você pode usar um serviço externo:

### Cron-job.org (Gratuito)

1. Acesse [cron-job.org](https://cron-job.org)
2. Crie uma conta gratuita
3. Adicione um novo job:
   - **URL**: `https://seu-dominio.vercel.app/api/cron/lembretes`
   - **Schedule**: A cada 5 minutos
   - **Method**: GET ou POST
4. Salve

### EasyCron

1. Acesse [EasyCron](https://www.easycron.com)
2. Configure similar ao cron-job.org

## 📊 Verificar Execuções

Para ver quando o cron foi executado pela última vez:

1. Vercel Dashboard > **Settings > Cron Jobs**
2. Clique no cron job
3. Veja o histórico de execuções

## 🐛 Troubleshooting

### Problema: Cron não aparece no Dashboard

**Solução**: 
- Verifique se o `vercel.json` está na raiz do projeto
- Faça um novo deploy
- Adicione manualmente conforme Passo 3

### Problema: Cron aparece mas não executa

**Solução**:
- Verifique os logs para erros
- Teste manualmente via GET/POST
- Verifique se há `CRON_SECRET` configurado (se sim, o cron precisa enviar o header)

### Problema: Cron executa mas não encontra compromissos

**Solução**:
- Verifique os logs detalhados
- Confirme que há compromissos futuros no banco
- Verifique se os campos `reminder_*_sent` existem

## ✅ Checklist Final

- [ ] `vercel.json` configurado com o cron
- [ ] Deploy feito na Vercel
- [ ] Cron aparece em **Settings > Cron Jobs**
- [ ] Status do cron está "Ativo"
- [ ] Logs mostram execuções do cron
- [ ] Teste manual retorna sucesso
