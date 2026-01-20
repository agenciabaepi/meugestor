/** @type {import('next').NextConfig} */
const path = require('path')

const projectRoot = path.resolve(__dirname)

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Transpilar recharts para compatibilidade com React 19
  transpilePackages: ['recharts'],
  
  // Configuração de imagens
  images: {
    remotePatterns: [],
    // Permite imagens locais sem restrições (incluindo query strings para cache-busting)
    unoptimized: false,
  },
  
  // Configurações do Turbopack para evitar problemas de leitura de diretórios
  turbopack: {
    // Limitar o escopo do Turbopack ao diretório do projeto
    resolveAlias: {
      // Evitar resolver módulos fora do projeto
    },
  },
  // Configurações do webpack (usado quando --turbo não é usado)
  webpack: (config, { isServer, dev }) => {
    // Configurar o contexto do webpack para o diretório do projeto
    config.context = projectRoot
    
    // Desabilitar cache do webpack em desenvolvimento para evitar erros de ENOENT
    if (dev) {
      config.cache = false
    }
    
    // Ignorar diretórios que podem causar problemas
    config.watchOptions = {
      ...config.watchOptions,
      ignored: [
        '**/node_modules/**',
        '**/.git/**',
        '**/.next/**',
        '**/dist/**',
        '**/build/**',
        '**/.DS_Store',
        '**/Thumbs.db',
      ],
      aggregateTimeout: 500,
      poll: false,
      followSymlinks: false,
    }
    
    return config
  },
  
  // Define o root do projeto para evitar aviso de múltiplos lockfiles
  outputFileTracingRoot: projectRoot,
}

module.exports = nextConfig

