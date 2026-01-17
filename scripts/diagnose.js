#!/usr/bin/env node

/**
 * Script de diagnóstico do sistema
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

console.log('🔍 Diagnóstico do Sistema - ORGANIZAPAY\n')
console.log('=' .repeat(50))

// 1. Verificar Node.js
console.log('\n1️⃣  Verificando Node.js...')
try {
  const nodeVersion = execSync('node --version', { encoding: 'utf-8' }).trim()
  console.log(`   ✅ Node.js: ${nodeVersion}`)
  
  const majorVersion = parseInt(nodeVersion.replace('v', '').split('.')[0])
  if (majorVersion < 18) {
    console.log('   ⚠️  Recomendado: Node.js 18 ou superior')
  }
} catch (error) {
  console.log('   ❌ Node.js não encontrado!')
}

// 2. Verificar npm
console.log('\n2️⃣  Verificando npm...')
try {
  const npmVersion = execSync('npm --version', { encoding: 'utf-8' }).trim()
  console.log(`   ✅ npm: ${npmVersion}`)
} catch (error) {
  console.log('   ❌ npm não encontrado!')
}

// 3. Verificar dependências
console.log('\n3️⃣  Verificando dependências...')
const nodeModulesPath = path.join(process.cwd(), 'node_modules')
if (fs.existsSync(nodeModulesPath)) {
  console.log('   ✅ node_modules existe')
  
  // Verificar dependências críticas
  const criticalDeps = [
    'next',
    '@supabase/supabase-js',
    'openai',
    'react',
    'react-dom'
  ]
  
  const missing = []
  criticalDeps.forEach(dep => {
    const depPath = path.join(nodeModulesPath, dep)
    if (!fs.existsSync(depPath)) {
      missing.push(dep)
    }
  })
  
  if (missing.length > 0) {
    console.log(`   ⚠️  Dependências faltando: ${missing.join(', ')}`)
    console.log('   💡 Execute: npm install')
  } else {
    console.log('   ✅ Todas as dependências críticas instaladas')
  }
} else {
  console.log('   ❌ node_modules não encontrado')
  console.log('   💡 Execute: npm install')
}

// 4. Verificar arquivos importantes
console.log('\n4️⃣  Verificando arquivos do projeto...')
const importantFiles = [
  'package.json',
  '.env.local',
  '.env.example',
  'next.config.js',
  'tsconfig.json',
  'tailwind.config.ts',
  'app/api/whatsapp/webhook/route.ts',
  'lib/db/client.ts'
]

importantFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file)
  if (fs.existsSync(filePath)) {
    console.log(`   ✅ ${file}`)
  } else {
    console.log(`   ❌ ${file} não encontrado`)
  }
})

// 5. Verificar variáveis de ambiente
console.log('\n5️⃣  Verificando variáveis de ambiente...')
const envPath = path.join(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  console.log('   ✅ .env.local existe')
  
  const envContent = fs.readFileSync(envPath, 'utf-8')
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'OPENAI_API_KEY',
    'WHATSAPP_PHONE_NUMBER_ID',
    'WHATSAPP_ACCESS_TOKEN',
    'WHATSAPP_VERIFY_TOKEN'
  ]
  
  const missing = []
  requiredVars.forEach(varName => {
    if (!envContent.includes(`${varName}=`)) {
      missing.push(varName)
    }
  })
  
  if (missing.length > 0) {
    console.log(`   ⚠️  Variáveis faltando: ${missing.join(', ')}`)
  } else {
    console.log('   ✅ Todas as variáveis obrigatórias configuradas')
  }
} else {
  console.log('   ❌ .env.local não encontrado')
  console.log('   💡 Copie .env.example para .env.local e configure')
}

// 6. Verificar estrutura de diretórios
console.log('\n6️⃣  Verificando estrutura de diretórios...')
const importantDirs = [
  'app',
  'app/api',
  'app/dashboard',
  'lib',
  'lib/db',
  'lib/services',
  'lib/ai',
  'supabase/migrations'
]

importantDirs.forEach(dir => {
  const dirPath = path.join(process.cwd(), dir)
  if (fs.existsSync(dirPath)) {
    console.log(`   ✅ ${dir}/`)
  } else {
    console.log(`   ❌ ${dir}/ não encontrado`)
  }
})

// 7. Verificar permissões dos scripts
console.log('\n7️⃣  Verificando scripts...')
const scriptsDir = path.join(process.cwd(), 'scripts')
if (fs.existsSync(scriptsDir)) {
  const scripts = fs.readdirSync(scriptsDir).filter(f => f.endsWith('.js'))
  scripts.forEach(script => {
    const scriptPath = path.join(scriptsDir, script)
    try {
      fs.accessSync(scriptPath, fs.constants.X_OK)
      console.log(`   ✅ ${script} (executável)`)
    } catch {
      console.log(`   ⚠️  ${script} (sem permissão de execução)`)
      console.log(`      💡 Execute: chmod +x scripts/${script}`)
    }
  })
}

console.log('\n' + '='.repeat(50))
console.log('\n✅ Diagnóstico completo!')
console.log('\n💡 Dicas:')
console.log('   - Execute "npm run check-env" para verificar variáveis')
console.log('   - Execute "npm run dev" para iniciar o servidor')
console.log('   - Veja TROUBLESHOOTING.md para mais ajuda\n')
