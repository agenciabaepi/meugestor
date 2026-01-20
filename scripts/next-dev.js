#!/usr/bin/env node

/**
 * Next dev bootstrap (estável):
 * - Limpa `.next/` por padrão (evita cache corrompido que gera ENOENT/MODULE_NOT_FOUND)
 * - Força `--webpack` por padrão (mais previsível), com opção `--turbo`
 * - Alerta sobre lockfiles duplicados acima do projeto (causa "workspace root" errado)
 */

const { spawn } = require('child_process')
const fs = require('fs')
const net = require('net')
const path = require('path')

const projectRoot = path.resolve(__dirname, '..')
const userArgs = process.argv.slice(2)

const wantsTurbo = userArgs.includes('--turbo')
const wantsWebpack = userArgs.includes('--webpack')
const noClean = userArgs.includes('--no-clean')

const nextArgs = ['dev']
// Usa webpack por padrão (mais estável). Turbopack pode ser ativado com --turbo.
if (wantsTurbo) nextArgs.push('--turbo')
else if (wantsWebpack) nextArgs.push('--webpack')
else nextArgs.push('--webpack') // Padrão: webpack (mais estável que Turbopack)

const passthroughArgs = userArgs.filter(
  (a) => a !== '--turbo' && a !== '--webpack' && a !== '--no-clean'
)

function findNearestLockfileUp(startDir) {
  const lockNames = ['pnpm-lock.yaml', 'package-lock.json', 'yarn.lock', 'bun.lock', 'bun.lockb']
  let dir = startDir
  while (true) {
    for (const name of lockNames) {
      const candidate = path.join(dir, name)
      if (fs.existsSync(candidate)) return candidate
    }
    const parent = path.dirname(dir)
    if (parent === dir) return null
    dir = parent
  }
}

function findRootLockfilesChain(cwd) {
  const found = []
  let currentCwd = cwd
  while (true) {
    const lockfile = findNearestLockfileUp(currentCwd)
    if (!lockfile) break
    found.push(lockfile)

    const lockDir = path.dirname(lockfile)
    const parentDir = path.dirname(lockDir)
    if (parentDir === lockDir) break
    currentCwd = parentDir
  }
  return found
}

function parseDesiredPort(args) {
  // Next CLI: -p 3000 | --port 3000
  const portFlagIndex = args.findIndex((a) => a === '--port' || a === '-p')
  if (portFlagIndex !== -1) {
    const raw = args[portFlagIndex + 1]
    const parsed = Number(raw)
    if (Number.isFinite(parsed) && parsed > 0) return parsed
  }
  return 3000
}

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net
      .createServer()
      .once('error', (err) => {
        if (err && err.code === 'EADDRINUSE') return resolve(false)
        return resolve(true)
      })
      .once('listening', () => {
        server.close(() => resolve(true))
      })

    // Bind apenas no loopback para não pegar permissão/firewall
    server.listen(port, '127.0.0.1')
  })
}

async function main() {
  try {
    const chain = findRootLockfilesChain(projectRoot)
    if (chain.length > 1) {
      // eslint-disable-next-line no-console
      console.warn(
        [
          '[dev] Atenção: existem lockfiles duplicados acima do projeto.',
          '[dev] Isso pode fazer o Next.js inferir o "workspace root" errado e quebrar watch/compilação.',
          ...chain.map((p) => `  - ${p}`),
        ].join('\n')
      )
    }
  } catch {
    // ignore
  }

  const desiredPort = parseDesiredPort(passthroughArgs)
  const portFree = await isPortAvailable(desiredPort)
  if (!portFree) {
    // eslint-disable-next-line no-console
    console.error(
      [
        `[dev] Porta ${desiredPort} já está em uso.`,
        `[dev] Para evitar corrupção de cache (.next) por múltiplos processos do Next, este script vai abortar aqui.`,
        `[dev] Finalize o processo que está usando a porta ${desiredPort} e rode novamente.`,
        `[dev] (Ou rode com \`--port <outra>\` / \`-p <outra>\`.)`,
      ].join('\n')
    )
    process.exit(1)
  }

  if (!noClean && !process.env.KEEP_NEXT_CACHE) {
    const nextDir = path.join(projectRoot, '.next')
    try {
      fs.rmSync(nextDir, { recursive: true, force: true })
      // eslint-disable-next-line no-console
      console.log('[dev] cache .next limpo')
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[dev] não foi possível limpar .next:', err?.message || err)
    }
  }

  // Workaround (macOS/Next 16): em alguns ambientes o Next/Turbopack tenta persistir
  // artefatos antes de criar a árvore de diretórios dentro de `.next/`, causando ENOENT.
  // Criamos as pastas básicas para garantir que os writes iniciais não falhem.
  try {
    const dirs = [
      '.next',
      '.next/cache',
      '.next/cache/turbopack',
      '.next/cache/webpack',
      '.next/cache/webpack/client-development',
      '.next/cache/webpack/server-development',
      '.next/dev',
      '.next/dev/server',
      '.next/dev/static',
      '.next/dev/static/development',
    ]
    for (const rel of dirs) {
      fs.mkdirSync(path.join(projectRoot, rel), { recursive: true })
    }
    
    // Cria arquivos de manifesto vazios para evitar erros MODULE_NOT_FOUND iniciais
    // O Next.js vai sobrescrever esses arquivos durante a compilação
    const manifestFiles = [
      '.next/dev/server/middleware-manifest.json',
      '.next/dev/server/next-font-manifest.json',
      '.next/dev/server/pages-manifest.json',
      '.next/dev/server/app-paths-manifest.json',
      '.next/dev/server/routes-manifest.json',
    ]
    for (const rel of manifestFiles) {
      const fullPath = path.join(projectRoot, rel)
      const dir = path.dirname(fullPath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      if (!fs.existsSync(fullPath)) {
        fs.writeFileSync(fullPath, JSON.stringify({}), 'utf8')
      }
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[dev] não foi possível preparar pastas em .next:', err?.message || err)
  }

  const nextBinName = process.platform === 'win32' ? 'next.cmd' : 'next'
  const localNextBin = path.join(projectRoot, 'node_modules', '.bin', nextBinName)
  const nextCmd = fs.existsSync(localNextBin) ? localNextBin : nextBinName

  const child = spawn(nextCmd, [...nextArgs, ...passthroughArgs], {
    cwd: projectRoot,
    stdio: 'inherit',
    // Em mac/linux, `shell: true` quebra paths com espaço (ex: "Meu Gestor").
    // No Windows, precisamos do shell para executar `.cmd` corretamente.
    shell: process.platform === 'win32',
    env: process.env,
  })

  child.on('exit', (code) => process.exit(code ?? 0))
  child.on('error', (err) => {
    // eslint-disable-next-line no-console
    console.error('[dev] falha ao iniciar next:', err)
    process.exit(1)
  })
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[dev] erro inesperado:', err)
  process.exit(1)
})

