'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LOGO_URL } from '@/lib/constants'
import {
  LayoutDashboard,
  Wallet,
  Calendar,
  BarChart3,
  User,
  ListChecks,
  Building2,
  Users,
  CreditCard,
  TrendingUp,
} from 'lucide-react'
import LogoutButton from './LogoutButton'
import type { SessionContext } from '@/lib/db/types'
import { ThemeToggle } from '@/app/components/ThemeToggle'

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

export function Sidebar({
  sessionContext,
}: {
  sessionContext: SessionContext | null
}) {
  const pathname = usePathname()
  const isEmpresa = sessionContext?.mode === 'empresa'

  return (
    <>
      {/* Sidebar - Apenas Desktop */}
      <aside
        className="hidden lg:block fixed top-0 left-0 h-screen w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 z-40"
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Logo */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20">
            <Link
              href="/dashboard"
              className="flex items-center justify-center w-full group"
            >
              <div className="relative h-8 w-[180px] group-hover:opacity-95 transition-opacity flex items-center justify-center">
                <img
                  src={LOGO_URL}
                  alt="ORGANIZAPAY"
                  className="h-full w-auto object-contain"
                />
              </div>
              <span className="sr-only">ORGANIZAPAY</span>
            </Link>
            <ThemeToggle />
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
            <div className="space-y-1">
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
                        flex items-center gap-3 px-4 py-3 rounded-lg
                        transition-all duration-200
                        ${
                          isActive
                            ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-semibold shadow-sm'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                        }
                      `}
                    >
                      <Icon
                        className={`w-5 h-5 ${
                          isActive 
                            ? 'text-emerald-700 dark:text-emerald-400' 
                            : 'text-gray-500 dark:text-gray-400'
                        }`}
                      />
                      <span className="text-sm">{item.label}</span>
                    </Link>
                  )
                })}
            </div>
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-800 space-y-2">
            <Link
              href="/dashboard/perfil"
              className={`
                flex items-center gap-3 px-4 py-3 rounded-lg
                transition-all duration-200
                ${
                  pathname === '/dashboard/perfil'
                    ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-semibold'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                }
              `}
            >
              <User className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <span className="text-sm">Perfil</span>
            </Link>
            <div className="px-4">
              <LogoutButton />
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
