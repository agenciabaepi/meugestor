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
  
  // Root do projeto para output tracing
  outputFileTracingRoot: projectRoot,
  
  // Configuração do webpack (desabilita Turbopack que está causando problemas)
  webpack: (config, { isServer, dev }) => {
    // Configurar o contexto do webpack para o diretório do projeto
    config.context = projectRoot
    
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
}

module.exports = nextConfig

