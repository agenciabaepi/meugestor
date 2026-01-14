import Link from 'next/link'
import { redirect } from 'next/navigation'
import { MobileMenu } from './MobileMenu'
import { getSession } from '@/lib/utils/auth'
import LogoutButton from './LogoutButton'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Verifica autenticação
  const session = await getSession()
  
  if (!session) {
    redirect('/login?redirect=/dashboard')
  }
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <div className="flex items-center flex-1 min-w-0">
              {/* Mobile Menu Button */}
              <div className="lg:hidden flex items-center mr-2">
                <MobileMenu />
              </div>
              
              <Link 
                href="/dashboard" 
                className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-600 truncate"
              >
                Meu Gestor
              </Link>
            </div>
            
            {/* Desktop Navigation */}
            <nav className="hidden lg:flex space-x-2 xl:space-x-4">
              <Link
                href="/dashboard"
                className="text-gray-700 hover:text-blue-600 px-2 xl:px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Visão Geral
              </Link>
              <Link
                href="/dashboard/financeiro"
                className="text-gray-700 hover:text-blue-600 px-2 xl:px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Financeiro
              </Link>
              <Link
                href="/dashboard/agenda"
                className="text-gray-700 hover:text-blue-600 px-2 xl:px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Agenda
              </Link>
              <Link
                href="/dashboard/relatorios"
                className="text-gray-700 hover:text-blue-600 px-2 xl:px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Relatórios
              </Link>
            </nav>

            {/* Desktop User Menu */}
            <div className="hidden lg:flex items-center ml-4 space-x-3">
              <Link
                href="/dashboard/perfil"
                className="text-gray-600 hover:text-gray-900 text-sm px-3 py-2 rounded-md hover:bg-gray-100 transition-colors"
              >
                Perfil
              </Link>
              <LogoutButton />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        {children}
      </main>
    </div>
  )
}
