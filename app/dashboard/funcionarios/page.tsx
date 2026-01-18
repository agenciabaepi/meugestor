import { Suspense } from 'react'
import { getSessionContext } from '@/lib/utils/session-context'
import { redirect } from 'next/navigation'
import { getFuncionariosByEmpresa } from '@/lib/db/queries-empresa'
import { FuncionariosClient } from './FuncionariosClient'

export default async function FuncionariosPage({
  searchParams,
}: {
  searchParams?: Promise<{ mes?: string; ano?: string }>
}) {
  const ctx = await getSessionContext()

  // Verifica se está no modo empresa
  if (!ctx || ctx.mode !== 'empresa' || !ctx.empresa_id) {
    redirect('/dashboard')
  }

  // Obtém o período selecionado ou usa o mês atual
  const params = searchParams instanceof Promise ? await searchParams : searchParams
  const now = new Date()
  const mesSelecionado = params?.mes ? parseInt(params.mes) : now.getMonth() + 1
  const anoSelecionado = params?.ano ? parseInt(params.ano) : now.getFullYear()

  // Busca funcionários
  const funcionarios = await getFuncionariosByEmpresa(ctx.tenant_id, ctx.empresa_id)

  return (
    <FuncionariosClient 
      funcionarios={funcionarios}
      mesSelecionado={mesSelecionado}
      anoSelecionado={anoSelecionado}
    />
  )
}
