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
  webpack: (config, { isServer }) => {
    // Configurar o contexto do webpack para o diretório do projeto
    // Isso é fundamental para limitar o escopo do watch
    config.context = projectRoot
    
    // Ignorar diretórios que podem causar problemas
    config.watchOptions = {
      ...config.watchOptions,
      ignored: [
        // Ignorar diretórios comuns dentro do projeto
        '**/node_modules/**',
        '**/.git/**',
        '**/.next/**',
        '**/dist/**',
        '**/build/**',
        '**/.DS_Store',
        '**/Thumbs.db',
        // Ignorar diretórios grandes comuns
        '**/Library/**',
        '**/Desktop/**',
        '**/Downloads/**',
        '**/Movies/**',
        '**/Music/**',
        '**/Pictures/**',
      ],
      // Agregar timeout para evitar muitos eventos
      aggregateTimeout: 500,
      // Não usar polling (mais rápido)
      poll: false,
      // Ignorar permissões de arquivo
      followSymlinks: false,
    }
    
    return config
  },
  // Configuração adicional para limitar o escopo
  // Limitar o output file tracing ao diretório do projeto
  outputFileTracingRoot: projectRoot,
}

module.exports = nextConfig

