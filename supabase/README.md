# Migrations do Supabase

Este diretório contém as migrations SQL para configurar o banco de dados.

## 📋 Migrations Disponíveis

1. **001_initial_schema.sql** - Cria todas as tabelas do sistema
2. **002_rls_policies.sql** - Configura Row Level Security (RLS)

## 🚀 Como Aplicar

### Opção 1: Via Supabase Dashboard

1. Acesse o [Supabase Dashboard](https://app.supabase.com)
2. Selecione seu projeto
3. Vá em **SQL Editor**
4. Execute cada migration na ordem:
   - Primeiro: `001_initial_schema.sql`
   - Depois: `002_rls_policies.sql`

### Opção 2: Via Supabase CLI

```bash
# Instalar Supabase CLI (se ainda não tiver)
npm install -g supabase

# Fazer login
supabase login

# Linkar ao projeto
supabase link --project-ref seu-project-ref

# Aplicar migrations
supabase db push
```

## ✅ Verificação

Após aplicar as migrations, verifique se as tabelas foram criadas:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
AND table_name IN ('tenants', 'users', 'financeiro', 'compromissos', 'conversations');
```

## 🔐 Variáveis de Ambiente Necessárias

Certifique-se de ter as seguintes variáveis no seu `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=sua_url_do_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role
```

## 📝 Notas

- As migrations criam todas as tabelas com RLS habilitado
- O RLS garante isolamento total por tenant
- Todas as foreign keys têm `ON DELETE CASCADE` para manter integridade
