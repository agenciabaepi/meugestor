import { BottomNav } from './BottomNav'
import { Header } from './Header'
import { getSessionContext } from '@/lib/utils/session-context'
import { AnimatedTopoBackground } from '@/app/components/AnimatedTopoBackground'

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
    <div className="relative isolate min-h-screen bg-linear-to-br from-emerald-50 via-white to-emerald-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <AnimatedTopoBackground src="/bg.svg" opacity={0.14} linesOnly motionScale={1.05} speedScale={0.9} />
      {/* Header - Fixo no topo (Desktop) */}
      <Header sessionContext={sessionContext} />

      {/* Main Content - Com padding para o header */}
      <main className="relative z-10 lg:pt-16 min-h-screen pb-20 lg:pb-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-6 lg:py-8 w-full">
          <div className="w-full">
            {children}
          </div>
        </div>
      </main>

      {/* Bottom Navigation - Mobile Only */}
      <div className="relative z-10">
        <BottomNav sessionContext={sessionContext} />
      </div>
    </div>
  )
}
