'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ThemeToggle } from '@/app/components/ThemeToggle'
import { User, Building2 as BuildingIcon } from 'lucide-react'
import { LOGO_URL } from '@/lib/constants'
import { useToast } from '@/app/components/ui'
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
  const router = useRouter()
  const toast = useToast()
  const isEmpresa = sessionContext?.mode === 'empresa'
  const [isVisible, setIsVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)
  const [empresas, setEmpresas] = useState<Array<{ id: string; nome_fantasia: string }>>([])
  const [loadingMode, setLoadingMode] = useState(false)

  // Carrega empresas ao montar o componente
  useEffect(() => {
    const loadEmpresas = async () => {
      try {
        const response = await fetch('/api/empresas')
        if (response.ok) {
          const data = await response.json()
          setEmpresas(data.empresas || [])
        }
      } catch (error) {
        console.error('Erro ao carregar empresas:', error)
      }
    }
    loadEmpresas()
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY

      // Mostra o header quando está no topo ou quando rola para cima
      if (currentScrollY < 10) {
        setIsVisible(true)
      } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // Oculta quando rola para baixo (após 100px)
        setIsVisible(false)
      } else if (currentScrollY < lastScrollY) {
        // Mostra quando rola para cima
        setIsVisible(true)
      }

      setLastScrollY(currentScrollY)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [lastScrollY])

  const handleToggleMode = async (targetMode: 'pessoal' | 'empresa', e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Se já está no modo selecionado, não faz nada
    if ((targetMode === 'empresa' && isEmpresa) || (targetMode === 'pessoal' && !isEmpresa)) {
      return
    }
    
    console.log('[Header] Toggle mode:', { currentMode: isEmpresa ? 'empresa' : 'pessoal', targetMode, empresasCount: empresas.length })
    
    // Se está mudando para empresa, precisa ter pelo menos uma empresa
    if (targetMode === 'empresa' && empresas.length === 0) {
      toast.error('Nenhuma empresa', 'Cadastre uma empresa primeiro no perfil.')
      return
    }

    setLoadingMode(true)
    try {
      // Se mudando para empresa, usa a primeira empresa ou a empresa_id atual
      const empresaId = targetMode === 'empresa' 
        ? (sessionContext?.empresa_id || empresas[0]?.id || null)
        : null

      if (targetMode === 'empresa' && !empresaId) {
        toast.error('Erro', 'Nenhuma empresa disponível.')
        setLoadingMode(false)
        return
      }

      console.log('[Header] Enviando requisição:', { mode: targetMode, empresaId })

      const response = await fetch('/api/auth/context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: targetMode,
          empresaId: empresaId,
        }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        console.error('[Header] Erro na resposta:', data)
        toast.error('Erro ao alterar modo', data.error || 'Não foi possível alterar o modo.')
        setLoadingMode(false)
        return
      }

      console.log('[Header] Modo alterado com sucesso:', data)
      toast.success('Modo alterado', `Modo alterado para ${targetMode === 'empresa' ? 'Empresa' : 'Pessoal'}.`)
      
      // Recarrega a página para atualizar o contexto
      router.refresh()
      // Pequeno delay para garantir que o toast apareça
      setTimeout(() => {
        window.location.reload()
      }, 500)
    } catch (error) {
      console.error('[Header] Erro ao alterar modo:', error)
      toast.error('Erro', 'Ocorreu um erro ao tentar alterar o modo.')
      setLoadingMode(false)
    }
  }

  return (
    <header 
      className={`hidden lg:block fixed top-0 left-0 right-0 h-20 bg-white/95 dark:bg-gray-900/95 border-b border-gray-200 dark:border-gray-800 z-30 transition-transform duration-300 ease-in-out ${
        isVisible ? 'translate-y-0' : '-translate-y-full'
      }`}
    >
      <div className="h-full flex items-center justify-between px-6">
        {/* Logo */}
        <div className="flex-shrink-0">
          <Link
            href="/dashboard"
            className="flex items-center group"
          >
            <div className="relative h-8 w-[160px] group-hover:opacity-95 transition-opacity flex items-center justify-center">
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
                  <span className="text-xs font-medium leading-tight">{item.label}</span>
                </Link>
              )
            })}
        </nav>

        {/* Ações do Header */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Toggle Modo Pessoal/Empresa - Design Segmentado */}
          <div className="relative inline-flex items-center rounded-full bg-gray-800 dark:bg-gray-700 p-0.5">
            {/* Pessoal */}
            <button
              type="button"
              onClick={(e) => handleToggleMode('pessoal', e)}
              disabled={loadingMode}
              className={`
                relative px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200
                focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900
                disabled:opacity-50 disabled:cursor-not-allowed
                ${
                  !isEmpresa
                    ? 'bg-emerald-600 text-gray-900 shadow-sm'
                    : 'text-emerald-400 border border-emerald-500 hover:bg-emerald-500/10'
                }
              `}
              title="Modo Pessoal"
              aria-label="Modo Pessoal"
            >
              <div className="flex items-center gap-1">
                <User className="w-3 h-3" />
                <span className="hidden sm:inline text-[10px]">Pessoal</span>
              </div>
            </button>
            
            {/* Empresa */}
            <button
              type="button"
              onClick={(e) => handleToggleMode('empresa', e)}
              disabled={loadingMode}
              className={`
                relative px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200
                focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900
                disabled:opacity-50 disabled:cursor-not-allowed
                ${
                  isEmpresa
                    ? 'bg-emerald-600 text-gray-900 shadow-sm'
                    : 'text-emerald-400 border border-emerald-500 hover:bg-emerald-500/10'
                }
              `}
              title="Modo Empresa"
              aria-label="Modo Empresa"
            >
              <div className="flex items-center gap-1">
                <BuildingIcon className="w-3 h-3" />
                <span className="hidden sm:inline text-[10px]">Empresa</span>
              </div>
            </button>
          </div>

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
