import { Sidebar } from './Sidebar'
import { BottomNav } from './BottomNav'
import { getSessionContext } from '@/lib/utils/session-context'

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
  
  const sessionContext = await getSessionContext()

  return (
    <div className="min-h-screen bg-linear-to-br from-emerald-50 via-white to-emerald-100">
      {/* Sidebar - Fixo (Desktop) */}
      <Sidebar sessionContext={sessionContext} />

      {/* Main Content - Sem gap, com margin para o sidebar fixo */}
      <main className="lg:ml-64 min-h-screen pb-20 lg:pb-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-6 lg:py-8 w-full">
          <div className="w-full">
            {children}
          </div>
        </div>
      </main>

      {/* Bottom Navigation - Mobile Only */}
      <BottomNav sessionContext={sessionContext} />
    </div>
  )
}
