import { getSessionContext } from '@/lib/utils/session-context'
import { getContasAReceberForContext } from '@/lib/services/financeiro'
import { ContasAReceberClient } from './ContasAReceberClient'

export const dynamic = 'force-dynamic'

export default async function ContasAReceberPage() {
  const ctx = await getSessionContext()
  
  if (!ctx) {
    return <div>Erro ao carregar dados</div>
  }

  // Busca todas as contas a receber (sem filtro de data para ver todas)
  const contasAReceber = await getContasAReceberForContext(ctx)
  
  console.log('[ContasAReceberPage] Total de contas a receber encontradas:', contasAReceber.length)
  if (contasAReceber.length > 0) {
    console.log('[ContasAReceberPage] Primeira conta:', {
      id: contasAReceber[0].id,
      description: contasAReceber[0].description,
      pago: contasAReceber[0].pago,
      transaction_type: (contasAReceber[0] as any).transaction_type,
      date: contasAReceber[0].date,
    })
  }

  // Calcula o total
  const totalPendente = contasAReceber.reduce((sum, conta) => sum + Number(conta.amount), 0)

  return (
    <ContasAReceberClient 
      contasAReceber={contasAReceber}
      totalPendente={totalPendente}
    />
  )
}
