# 🔍 Debug - Problema com Receitas

## ✅ Logs Adicionados

Adicionei logs detalhados em todos os pontos críticos do fluxo de processamento de receitas:

1. **Webhook** (`app/api/whatsapp/webhook/route.ts`)
   - Log quando recebe mensagem
   - Log do resultado da ação
   - Log de erros com stack trace

2. **processAction** (`lib/ai/actions.ts`)
   - Log da mensagem recebida
   - Log da intenção detectada
   - Log da intenção corrigida
   - Log da intenção final

3. **handleRegisterRevenue** (`lib/ai/actions.ts`)
   - Log dos dados recebidos
   - Log dos valores processados
   - Log antes de criar registro
   - Log após criar registro

4. **createFinanceiro** (`lib/db/queries.ts`)
   - Log detalhado de erros do Supabase
   - Log dos dados sendo inseridos

## 🔧 Verificar Migration

**IMPORTANTE**: A migration `008_financeiro_type.sql` precisa ser aplicada no banco de dados!

### Verificar se a migration foi aplicada:

```sql
-- Execute no Supabase SQL Editor
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'financeiro' 
AND column_name = 'transaction_type';
```

Se não retornar nada, a migration não foi aplicada.

### Aplicar a migration:

**Opção 1: Via Supabase Dashboard**
1. Acesse o Supabase Dashboard
2. Vá em SQL Editor
3. Cole o conteúdo de `supabase/migrations/008_financeiro_type.sql`
4. Execute

**Opção 2: Via CLI (se estiver usando Supabase local)**
```bash
supabase migration up
```

**Opção 3: Via CLI (produção)**
```bash
supabase db push
```

## 📊 Como Verificar os Logs

### Se estiver usando Vercel:
1. Acesse o Vercel Dashboard
2. Vá em seu projeto
3. Clique em "Functions" ou "Logs"
4. Procure pelos logs que começam com:
   - `Webhook -`
   - `processAction -`
   - `handleRegisterRevenue -`
   - `Error creating financeiro:`

### Se estiver rodando localmente:
Os logs aparecerão no terminal onde você está rodando `npm run dev`

## 🐛 Possíveis Problemas

### 1. Migration não aplicada
**Sintoma**: Erro ao inserir no banco relacionado a `transaction_type`
**Solução**: Aplicar a migration `008_financeiro_type.sql`

### 2. Categoria inválida
**Sintoma**: Erro de validação de categoria
**Solução**: Verificar se a categoria retornada está na lista de válidas

### 3. Dados faltando
**Sintoma**: `amount` ou `description` null/undefined
**Solução**: Verificar se a IA está extraindo os dados corretamente

## 🧪 Teste Manual

Teste com a mensagem: "Ganhei 20 reais de presente"

Os logs devem mostrar:
1. `Webhook - Processando ação para mensagem: Ganhei 20 reais de presente`
2. `processAction - Intenção detectada: register_revenue`
3. `handleRegisterRevenue - Dados recebidos: {...}`
4. `handleRegisterRevenue - Criando registro com: {...}`
5. `handleRegisterRevenue - Registro criado: Sucesso`

Se algum desses logs não aparecer, o problema está antes desse ponto.
