#!/usr/bin/env node

/**
 * Script para verificar se todas as variáveis de ambiente estão configuradas
 */

const fs = require('fs')
const path = require('path')

const requiredVars = {
  'NEXT_PUBLIC_SUPABASE_URL': 'URL do Supabase',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY': 'Chave anônima do Supabase',
  'SUPABASE_SERVICE_ROLE_KEY': 'Chave service role do Supabase',
  'OPENAI_API_KEY': 'Chave da API OpenAI',
  'OPENAI_MODEL': 'Modelo OpenAI (padrão: gpt-4o)',
  'WHATSAPP_PHONE_NUMBER_ID': 'ID do número do WhatsApp',
  'WHATSAPP_ACCESS_TOKEN': 'Token de acesso do WhatsApp',
  'WHATSAPP_VERIFY_TOKEN': 'Token de verificação do WhatsApp',
}

const optionalVars = {
  'WHATSAPP_WEBHOOK_SECRET': 'Secret do webhook (opcional)',
  'CRON_SECRET': 'Secret do cron (opcional)',
  'NEXT_PUBLIC_APP_URL': 'URL da aplicação (opcional)',
}

function checkEnv() {
  const envPath = path.join(process.cwd(), '.env.local')
  
  if (!fs.existsSync(envPath)) {
    console.error('❌ Arquivo .env.local não encontrado!')
    console.log('\n📝 Crie o arquivo .env.local com as variáveis necessárias.')
    console.log('   Use o arquivo .env.example como referência.\n')
    process.exit(1)
  }

  const envContent = fs.readFileSync(envPath, 'utf-8')
  const envVars = {}
  
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/)
    if (match) {
      const key = match[1].trim()
      const value = match[2].trim()
      if (value && !value.startsWith('#')) {
        envVars[key] = value
      }
    }
  })

  console.log('🔍 Verificando variáveis de ambiente...\n')

  let allOk = true
  const missing = []
  const empty = []

  // Verifica variáveis obrigatórias
  for (const [key, description] of Object.entries(requiredVars)) {
    if (!envVars[key]) {
      missing.push({ key, description })
      allOk = false
    } else if (envVars[key].includes('your_') || envVars[key].includes('sua_')) {
      empty.push({ key, description })
      allOk = false
    }
  }

  // Verifica variáveis opcionais
  const missingOptional = []
  for (const [key, description] of Object.entries(optionalVars)) {
    if (!envVars[key]) {
      missingOptional.push({ key, description })
    }
  }

  // Exibe resultados
  if (missing.length > 0) {
    console.log('❌ Variáveis obrigatórias faltando:')
    missing.forEach(({ key, description }) => {
      console.log(`   - ${key}: ${description}`)
    })
    console.log()
  }

  if (empty.length > 0) {
    console.log('⚠️  Variáveis com valores placeholder:')
    empty.forEach(({ key, description }) => {
      console.log(`   - ${key}: ${description}`)
    })
    console.log()
  }

  if (missingOptional.length > 0) {
    console.log('ℹ️  Variáveis opcionais não configuradas:')
    missingOptional.forEach(({ key, description }) => {
      console.log(`   - ${key}: ${description}`)
    })
    console.log()
  }

  if (allOk) {
    console.log('✅ Todas as variáveis obrigatórias estão configuradas!\n')
    
    if (missingOptional.length > 0) {
      console.log('💡 Dica: Configure as variáveis opcionais para funcionalidades adicionais.\n')
    }
    
    return true
  } else {
    console.log('❌ Configure as variáveis faltantes no arquivo .env.local\n')
    return false
  }
}

if (require.main === module) {
  const success = checkEnv()
  process.exit(success ? 0 : 1)
}

module.exports = { checkEnv }
