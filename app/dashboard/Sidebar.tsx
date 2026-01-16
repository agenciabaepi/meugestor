'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Wallet,
  Calendar,
  BarChart3,
  User,
} from 'lucide-react'
import LogoutButton from './LogoutButton'

const menuItems = [
  {
    href: '/dashboard',
    label: 'Visão Geral',
    icon: LayoutDashboard,
  },
  {
    href: '/dashboard/financeiro',
    label: 'Financeiro',
    icon: Wallet,
  },
  {
    href: '/dashboard/agenda',
    label: 'Agenda',
    icon: Calendar,
  },
  {
    href: '/dashboard/relatorios',
    label: 'Relatórios',
    icon: BarChart3,
  },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <>
      {/* Sidebar - Apenas Desktop */}
      <aside
        className="hidden lg:block fixed top-0 left-0 h-screen w-64 bg-white border-r border-gray-200 z-40"
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Logo */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-linear-to-r from-emerald-50 to-emerald-100">
            <Link
              href="/dashboard"
              className="flex items-center gap-3 group"
            >
              <div className="w-10 h-10 bg-linear-to-br from-emerald-700 to-emerald-600 rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
                <Wallet className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="text-xl font-bold text-gray-900 block">Meu Gestor</span>
                <span className="text-xs text-gray-500">Gestão Inteligente</span>
              </div>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
            <div className="space-y-1">
              {menuItems.map((item) => {
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
                          ? 'bg-emerald-50 text-emerald-700 font-semibold shadow-sm'
                          : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                      }
                    `}
                  >
                    <Icon
                      className={`w-5 h-5 ${
                        isActive ? 'text-emerald-700' : 'text-gray-500'
                      }`}
                    />
                    <span className="text-sm">{item.label}</span>
                  </Link>
                )
              })}
            </div>
          </nav>

          {/* Upgrade Card - Oculto temporariamente */}
          {/* <div className="px-4 pb-4">
            <div className="relative bg-gradient-to-b from-[#7A5AF8] to-[#5F2EAE] rounded-3xl p-6 pt-10 overflow-hidden shadow-xl">
              <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 z-10">
                <div className="relative">
                  <div className="w-16 h-16 bg-gradient-to-b from-[#8B6DFF] to-[#6B3FD9] rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-inner relative">
                      <svg 
                        className="w-6 h-6" 
                        viewBox="0 0 24 24" 
                        fill="white"
                      >
                        <path 
                          d="M 18,6 Q 22,10 22,12 Q 22,14 18,18 Q 14,14 14,12 Q 14,10 18,6 M 17,8 Q 15,10 15,12 Q 15,14 17,16 Q 19,14 19,12 Q 19,10 17,8"
                          fill="white"
                          fillRule="evenodd"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
              <div className="pt-6 text-center">
                <h3 className="text-lg font-bold text-white mb-2">
                  Upgrade to PRO
                </h3>
                <p className="text-sm text-white/90 mb-5 leading-relaxed px-1">
                  Melhore seu processo de gestão e faça mais com Meu Gestor PRO!
                </p>
                <button className="w-full bg-white/20 hover:bg-white/30 text-white font-semibold py-2.5 px-4 rounded-xl transition-all duration-200 backdrop-blur-sm border border-white/30 shadow-md hover:shadow-lg">
                  Upgrade to PRO
                </button>
              </div>
            </div>
          </div> */}

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 space-y-2">
            <Link
              href="/dashboard/perfil"
              className={`
                flex items-center gap-3 px-4 py-3 rounded-lg
                transition-all duration-200
                ${
                  pathname === '/dashboard/perfil'
                    ? 'bg-emerald-50 text-emerald-700 font-semibold'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                }
              `}
            >
              <User className="w-5 h-5 text-gray-500" />
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
