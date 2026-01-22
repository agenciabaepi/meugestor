'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { ThemeToggle } from '@/app/components/ThemeToggle'
import { User } from 'lucide-react'
import { LOGO_URL } from '@/lib/constants'
import {
  LayoutDashboard,
  Wallet,
  Calendar,
  BarChart3,
  ListChecks,
  Building2,
  Users,
  CreditCard,
  TrendingUp,
} from 'lucide-react'
import type { SessionContext } from '@/lib/db/types'

const menuItems = [
  {
    href: '/dashboard',
    label: 'Visão Geral',
    icon: LayoutDashboard,
    showAlways: true,
  },
  {
    href: '/dashboard/financeiro',
    label: 'Financeiro',
    icon: Wallet,
    showAlways: true,
  },
  {
    href: '/dashboard/contas-a-pagar',
    label: 'Contas a Pagar',
    icon: CreditCard,
    showAlways: true,
  },
  {
    href: '/dashboard/contas-a-receber',
    label: 'Contas a Receber',
    icon: TrendingUp,
    showAlways: true,
  },
  {
    href: '/dashboard/agenda',
    label: 'Agenda',
    icon: Calendar,
    showAlways: true,
  },
  {
    href: '/dashboard/listas',
    label: 'Listas',
    icon: ListChecks,
    showAlways: true,
  },
  {
    href: '/dashboard/fornecedores',
    label: 'Fornecedores',
    icon: Building2,
    showAlways: false, // Apenas para empresas
  },
  {
    href: '/dashboard/funcionarios',
    label: 'Funcionários',
    icon: Users,
    showAlways: false, // Apenas para empresas
  },
  {
    href: '/dashboard/relatorios',
    label: 'Relatórios',
    icon: BarChart3,
    showAlways: true,
  },
]

export function Header({ sessionContext }: { sessionContext: SessionContext | null }) {
  const pathname = usePathname()
  const isEmpresa = sessionContext?.mode === 'empresa'

  return (
    <header className="hidden lg:block fixed top-0 left-0 right-0 h-16 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 z-30">
      <div className="h-full flex items-center justify-between px-6">
        {/* Logo */}
        <div className="flex-shrink-0">
          <Link
            href="/dashboard"
            className="flex items-center group"
          >
            <div className="relative h-7 w-[140px] group-hover:opacity-95 transition-opacity flex items-center justify-center">
              <img
                src={LOGO_URL}
                alt="ORGANIZAPAY"
                className="h-full w-auto object-contain"
              />
            </div>
            <span className="sr-only">ORGANIZAPAY</span>
          </Link>
        </div>

        {/* Menu Centralizado */}
        <nav className="flex-1 flex items-center justify-center gap-1 max-w-4xl mx-auto">
          {menuItems
            .filter((item) => item.showAlways || isEmpresa)
            .map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg
                    transition-all duration-200
                    min-w-[70px]
                    ${
                      isActive
                        ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                    }
                  `}
                  title={item.label}
                >
                  <Icon
                    className={`w-5 h-5 ${
                      isActive
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}
                  />
                  <span className="text-xs font-medium">{item.label}</span>
                </Link>
              )
            })}
        </nav>

        {/* Ações do Header */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Perfil */}
          <Link
            href="/dashboard/perfil"
            className="
              p-2 rounded-lg
              text-gray-600 dark:text-gray-300
              hover:bg-gray-100 dark:hover:bg-gray-800
              transition-colors
              focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900
            "
            aria-label="Perfil"
            title="Perfil"
          >
            <User className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </header>
  )
}
