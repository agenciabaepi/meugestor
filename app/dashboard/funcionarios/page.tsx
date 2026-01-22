import { getSessionContext } from '@/lib/utils/session-context'
import { redirect } from 'next/navigation'
import { getFuncionariosByEmpresa } from '@/lib/db/queries-empresa'
import { FuncionariosClient } from './FuncionariosClient'

export const dynamic = 'force-dynamic'

export default async function FuncionariosPage() {
  const ctx = await getSessionContext()

  // Verifica se está no modo empresa
  if (!ctx || ctx.mode !== 'empresa' || !ctx.empresa_id) {
    redirect('/dashboard')
  }

  // Busca funcionários
  const funcionarios = await getFuncionariosByEmpresa(ctx.tenant_id, ctx.empresa_id)

  return <FuncionariosClient funcionarios={funcionarios} />
}
