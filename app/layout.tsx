import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { LOGO_URL } from '@/lib/constants'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'ORGANIZAPAY - Assistente Inteligente',
  description: 'SaaS Multitenant - Assistente Inteligente via WhatsApp',
  applicationName: 'ORGANIZAPAY',
  icons: {
    icon: [{ url: LOGO_URL, type: 'image/png' }],
    apple: [{ url: LOGO_URL }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'ORGANIZAPAY',
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
  themeColor: '#10B981', // Emerald-500 para seguir a identidade verde
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body suppressHydrationWarning className={`${inter.className} antialiased`}>
        {children}
      </body>
    </html>
  )
}

