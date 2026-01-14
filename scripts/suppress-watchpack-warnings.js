#!/usr/bin/env node

/**
 * Script para iniciar o Next.js suprimindo avisos do Watchpack
 * 
 * Uso: node scripts/suppress-watchpack-warnings.js
 * Ou: npm run dev:quiet
 */

const { spawn } = require('child_process')
const path = require('path')

// Filtrar avisos do Watchpack
const filterWatchpackWarnings = (data) => {
  const lines = data.toString().split('\n')
  return lines
    .filter(line => {
      // Manter todas as linhas exceto avisos do Watchpack
      return !line.includes('Watchpack Error (watcher)')
    })
    .join('\n')
}

// Iniciar o Next.js
const nextProcess = spawn('next', ['dev', '--webpack'], {
  cwd: path.resolve(__dirname, '..'),
  stdio: ['inherit', 'pipe', 'pipe'],
  shell: true,
})

// Processar stdout
nextProcess.stdout.on('data', (data) => {
  const filtered = filterWatchpackWarnings(data)
  if (filtered.trim()) {
    process.stdout.write(filtered)
  }
})

// Processar stderr
nextProcess.stderr.on('data', (data) => {
  const filtered = filterWatchpackWarnings(data)
  if (filtered.trim()) {
    process.stderr.write(filtered)
  }
})

// Gerenciar saída
nextProcess.on('close', (code) => {
  process.exit(code)
})

nextProcess.on('error', (error) => {
  console.error('Erro ao iniciar Next.js:', error)
  process.exit(1)
})
