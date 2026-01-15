import { redirect } from 'next/navigation'
import { Sidebar } from './Sidebar'
import { getSession } from '@/lib/utils/auth'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Verifica autenticação
  // TEMPORARIAMENTE DESABILITADO PARA EVITAR LOOP
  // TODO: Implementar verificação de autenticação via middleware
  // const session = await getSession()
  // if (!session) {
  //   redirect('/login?redirect=/dashboard')
  // }
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar - Fixo */}
      <Sidebar />

      {/* Main Content - Sem gap, com margin para o sidebar fixo */}
      <main className="lg:ml-64 min-h-screen pt-16 lg:pt-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-6 lg:py-8 w-full">
          <div className="w-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}
