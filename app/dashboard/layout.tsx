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
    <div className="min-h-screen bg-gray-50 flex flex-col lg:flex-row">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 w-full lg:ml-64 min-h-screen pt-16 lg:pt-0">
        <div className="max-w-7xl mx-auto p-3 sm:p-4 lg:p-6 xl:p-8 w-full overflow-x-hidden">
          {children}
        </div>
      </main>
    </div>
  )
}
