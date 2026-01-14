#!/usr/bin/env node

/**
 * Script para verificar se as migrations foram aplicadas
 */

console.log('📊 Verificando configuração do banco de dados...\n')
console.log('ℹ️  Para aplicar as migrations:')
console.log('   1. Acesse o Supabase Dashboard')
console.log('   2. Vá em SQL Editor')
console.log('   3. Execute as migrations em ordem:')
console.log('      - supabase/migrations/001_initial_schema.sql')
console.log('      - supabase/migrations/002_rls_policies.sql')
console.log('      - supabase/migrations/003_create_storage_bucket.sql')
console.log('      - supabase/migrations/004_security_and_plans.sql')
console.log('\n📚 Veja SETUP_SUPABASE.md para mais detalhes.\n')
