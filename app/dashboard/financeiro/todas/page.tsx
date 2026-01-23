import { Suspense } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { 
  getFinanceiroRecordsForContext, 
  getDespesasRecordsForContext,
  getReceitasRecordsForContext,
} from '@/lib/services/financeiro'
import { getSessionContext } from '@/lib/utils/session-context'
import { TodasTransacoesClient } from './TodasTransacoesClient'
import { PeriodoSelector } from '../PeriodoSelector'
import { AddTransacaoButton } from '../AddTransacaoButton'

export const dynamic = 'force-dynamic'

async function getTodasTransacoesData(searchParams?: { mes?: string; ano?: string }) {
  const ctx = await getSessionContext()
  
  if (!ctx) {
    return {
      despesasMes: [],
      receitasMes: [],
      todasTransacoes: [],
      periodoAtual: { mes: 0, ano: 0 },
    }
  }
  
  // Obtém o período selecionado ou usa o mês atual
  const now = new Date()
  const mesSelecionado = searchParams?.mes ? parseInt(searchParams.mes) : now.getMonth() + 1
  const anoSelecionado = searchParams?.ano ? parseInt(searchParams.ano) : now.getFullYear()
  
  const startOfMonth = new Date(anoSelecionado, mesSelecionado - 1, 1)
  const endOfMonth = new Date(anoSelecionado, mesSelecionado, 0)

  // Busca despesas e receitas separadamente para o período selecionado
  const despesasMes = await getDespesasRecordsForContext(
    ctx,
    startOfMonth.toISOString().split('T')[0],
    endOfMonth.toISOString().split('T')[0]
  )
  
  const receitasMes = await getReceitasRecordsForContext(
    ctx,
    startOfMonth.toISOString().split('T')[0],
    endOfMonth.toISOString().split('T')[0]
  )
  
  const todasTransacoes = await getFinanceiroRecordsForContext(
    ctx,
    startOfMonth.toISOString().split('T')[0],
    endOfMonth.toISOString().split('T')[0]
  )

  return {
    despesasMes,
    receitasMes,
    todasTransacoes,
    periodoAtual: { mes: mesSelecionado, ano: anoSelecionado },
  }
}

export default async function TodasTransacoesPage({
  searchParams,
}: {
  searchParams?: Promise<{ mes?: string; ano?: string }>
}) {
  const params = await searchParams
  const data = await getTodasTransacoesData(params)

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <Link
              href="/dashboard/financeiro"
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600 hover:text-gray-900"
              title="Voltar"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Todas as Transações</h1>
          </div>
          <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600 ml-11">
            Visualize todas as transações do período selecionado
          </p>
        </div>
        <AddTransacaoButton />
      </div>

      {/* Seletor de Período */}
      <Suspense fallback={
        <div className="bg-white rounded-lg shadow-sm sm:shadow p-4 sm:p-6 animate-pulse">
          <div className="h-10 bg-gray-200 rounded w-64"></div>
        </div>
      }>
        <PeriodoSelector />
      </Suspense>

      {/* Lista Completa de Transações */}
      <TodasTransacoesClient 
        despesas={data.despesasMes}
        receitas={data.receitasMes}
        todasTransacoes={data.todasTransacoes}
      />
    </div>
  )
}
