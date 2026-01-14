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
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 min-h-screen">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
