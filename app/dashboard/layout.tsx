import Link from 'next/link'
import { MobileMenu } from './MobileMenu'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <div className="flex items-center flex-1 min-w-0">
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

            {/* Mobile Menu Button */}
            <div className="lg:hidden flex items-center">
              <MobileMenu />
            </div>

            {/* Desktop Back Link */}
            <div className="hidden lg:flex items-center ml-4">
              <Link
                href="/"
                className="text-gray-600 hover:text-gray-900 text-sm px-3 py-2 rounded-md hover:bg-gray-100 transition-colors"
              >
                ← Voltar
              </Link>
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
