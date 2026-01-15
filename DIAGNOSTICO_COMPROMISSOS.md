# 🔍 Diagnóstico: Compromissos Não Aparecem Corretamente

## Problema
Você criou 5 compromissos para amanhã, mas quando pergunta no WhatsApp, só aparecem 3.

## Como Diagnosticar

### 1. Verificar no Banco de Dados

Execute no Supabase SQL Editor:

```sql
-- Verifica TODOS os compromissos do seu tenant
SELECT 
  id,
  title,
  scheduled_at,
  scheduled_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo' as scheduled_at_brazil,
  created_at
FROM compromissos
WHERE tenant_id = 'SEU_TENANT_ID_AQUI'
  AND scheduled_at >= NOW()
ORDER BY scheduled_at
LIMIT 20;
```

**Substitua `SEU_TENANT_ID_AQUI` pelo seu tenant_id real.**

### 2. Verificar Compromissos de Amanhã Especificamente

```sql
-- Compromissos de amanhã (calculado no timezone do Brasil)
WITH amanha_brasil AS (
  SELECT 
    (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo' + INTERVAL '1 day')::date as data_amanha
)
SELECT 
  c.id,
  c.title,
  c.scheduled_at,
  c.scheduled_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo' as scheduled_at_brazil,
  DATE(c.scheduled_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo') as data_brasil,
  (SELECT data_amanha FROM amanha_brasil) as amanha_esperado,
  CASE 
    WHEN DATE(c.scheduled_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo') = (SELECT data_amanha FROM amanha_brasil)
    THEN 'SIM - É amanhã'
    ELSE 'NÃO - Não é amanhã'
  END as eh_amanha
FROM compromissos c
CROSS JOIN amanha_brasil
WHERE c.tenant_id = 'SEU_TENANT_ID_AQUI'
  AND c.scheduled_at >= NOW() - INTERVAL '1 day'
  AND c.scheduled_at <= NOW() + INTERVAL '2 days'
ORDER BY c.scheduled_at;
```

### 3. Verificar Logs do Servidor

Quando você perguntar "quantos compromissos tenho amanhã" no WhatsApp, verifique os logs do Vercel:

1. Vercel Dashboard → **Logs**
2. Procure por: `handleQuery - Compromissos encontrados para amanhã`
3. Veja:
   - Quantos foram encontrados no intervalo ampliado
   - Quantos passaram pelo filtro final
   - Lista completa de IDs e títulos

### 4. Possíveis Causas

#### Causa 1: Datas Armazenadas em UTC
- Se um compromisso foi criado para 15/01 00:00 (Brasil)
- Pode estar armazenado como 15/01 03:00 UTC
- Quando busca "amanhã", pode não encontrar

#### Causa 2: Filtro Muito Restritivo
- O filtro pode estar removendo compromissos incorretamente
- Verifique os logs para ver quais foram filtrados

#### Causa 3: Limite do Supabase
- Supabase tem limite padrão de 1000 registros
- Mas para 5 compromissos, não deveria ser problema

## Solução Temporária

Se quiser ver TODOS os compromissos sem filtro de data:

```sql
-- Busca todos os compromissos futuros
SELECT 
  id,
  title,
  scheduled_at,
  scheduled_at AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo' as scheduled_at_brazil
FROM compromissos
WHERE tenant_id = 'SEU_TENANT_ID_AQUI'
  AND scheduled_at >= NOW()
ORDER BY scheduled_at;
```

## Próximos Passos

1. Execute as queries SQL acima
2. Verifique se os 5 compromissos estão no banco
3. Verifique se as datas estão corretas
4. Envie os resultados para ajustar o código
