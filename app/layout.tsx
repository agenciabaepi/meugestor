import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Meu Gestor - Assistente Inteligente',
  description: 'SaaS Multitenant - Assistente Inteligente via WhatsApp',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Meu Gestor',
  },
  formatDetection: {
    telephone: false,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: '#3B82F6',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body suppressHydrationWarning className="antialiased">{children}</body>
    </html>
  )
}

