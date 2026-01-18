import { getSessionContext } from '@/lib/utils/session-context'
import { redirect } from 'next/navigation'

export default async function FuncionariosPage() {
  const ctx = await getSessionContext()

  // Verifica se está no modo empresa
  if (!ctx || ctx.mode !== 'empresa' || !ctx.empresa_id) {
    redirect('/dashboard')
  }

  // TODO: Implementar página de funcionários
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Funcionários</h1>
      <p className="text-gray-600">Página em desenvolvimento.</p>
    </div>
  )
}
