import { getSessionContext } from '@/lib/utils/session-context'
import { getContasAPagarForContext } from '@/lib/services/financeiro'
import { ContasAPagarClient } from './ContasAPagarClient'

export const dynamic = 'force-dynamic'

export default async function ContasAPagarPage() {
  const ctx = await getSessionContext()
  
  if (!ctx) {
    return <div>Erro ao carregar dados</div>
  }

  // Busca todas as contas a pagar (sem filtro de data para ver todas)
  const contasAPagar = await getContasAPagarForContext(ctx)

  // Calcula o total
  const totalPendente = contasAPagar.reduce((sum, conta) => sum + Number(conta.amount), 0)

  return (
    <ContasAPagarClient 
      contasAPagar={contasAPagar}
      totalPendente={totalPendente}
    />
  )
}
