/** @type {import('next').NextConfig} */
const path = require('path')

const projectRoot = path.resolve(__dirname)
const isVercel = !!process.env.VERCEL

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Em alguns ambientes (macOS) a pasta `.next` pode ser limpa/alterada por processos externos,
  // causando ENOENT em dev. Usamos um distDir dedicado para estabilizar.
  // Na Vercel, o builder espera o output padrão em `.next`, então mantemos o default lá.
  distDir: isVercel ? '.next' : '.next-cache',

  // Transpilar recharts para compatibilidade com React 19
  transpilePackages: ['recharts'],
  
  // Configuração de imagens
  images: {
    remotePatterns: [],
    // Permite imagens locais sem restrições (incluindo query strings para cache-busting)
    unoptimized: false,
  },
  
  // Mantém o escopo do Next no diretório do projeto (evita "workspace root" errado)
  // e evita varredura acidental de diretórios enormes fora do projeto.
  turbopack: {
    root: projectRoot,
  },

  // Root do projeto para output tracing (deve bater com turbopack.root)
  outputFileTracingRoot: projectRoot,
}

module.exports = nextConfig

