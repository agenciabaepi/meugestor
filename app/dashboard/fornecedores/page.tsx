import { getSessionContext } from '@/lib/utils/session-context'
import { redirect } from 'next/navigation'
import { getFornecedoresByEmpresa } from '@/lib/db/queries-empresa'
import { FornecedoresClient } from './FornecedoresClient'

export default async function FornecedoresPage() {
  const ctx = await getSessionContext()

  // Verifica se está no modo empresa
  if (!ctx || ctx.mode !== 'empresa' || !ctx.empresa_id) {
    // Redireciona para dashboard se não for empresa
    redirect('/dashboard')
  }

  // Busca fornecedores
  const fornecedores = await getFornecedoresByEmpresa(ctx.tenant_id, ctx.empresa_id)

  return <FornecedoresClient fornecedores={fornecedores} />
}