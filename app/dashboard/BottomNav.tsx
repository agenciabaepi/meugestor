'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
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

const navItems = [
  {
    href: '/dashboard',
    label: 'Início',
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

export function BottomNav({
  sessionContext,
}: {
  sessionContext: SessionContext | null
}) {
  const pathname = usePathname()
  const isEmpresa = sessionContext?.mode === 'empresa'

  const filteredItems = navItems.filter((item) => item.showAlways || isEmpresa)

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-gray-200/50 z-50 safe-area-bottom shadow-lg">
      <div className="overflow-x-auto scrollbar-hide">
        <div className="flex items-center gap-1 px-2 py-2 min-w-max">
          {filteredItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  relative flex flex-col items-center justify-center 
                  px-3 py-2 rounded-xl
                  transition-all duration-200 ease-out
                  min-w-[64px] shrink-0 touch-manipulation
                  active:scale-95
                  ${isActive 
                    ? 'text-emerald-600' 
                    : 'text-gray-400 active:text-gray-600'
                  }
                `}
                style={{ minHeight: '56px' }}
              >
                {/* Indicador ativo - círculo de fundo sutil */}
                {isActive && (
                  <div className="absolute inset-0 bg-emerald-50/60 rounded-xl -z-10" />
                )}
                
                {/* Ícone */}
                <div className="flex items-center justify-center mb-1 transition-all duration-200">
                  <Icon 
                    className={`${
                      isActive ? 'w-5 h-5 text-emerald-600' : 'w-5 h-5 text-gray-400'
                    }`} 
                    strokeWidth={isActive ? 2 : 1.5}
                  />
                </div>
                
                {/* Label */}
                <span className={`
                  text-[11px] font-medium leading-tight whitespace-nowrap
                  transition-colors duration-200
                  ${isActive ? 'text-emerald-600' : 'text-gray-400'}
                `}>
                  {item.label}
                </span>
                
                {/* Indicador inferior mais fino */}
                {isActive && (
                  <div className="absolute -bottom-0.5 left-1/2 transform -translate-x-1/2 w-6 h-0.5 bg-emerald-600 rounded-full" />
                )}
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
