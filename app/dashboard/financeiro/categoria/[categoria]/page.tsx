import { Suspense } from 'react'
import { getSessionContext } from '@/lib/utils/session-context'
import { getFinanceiroByCategoryRecordsForContext } from '@/lib/services/financeiro'
import { redirect } from 'next/navigation'
import { CategoriaDetalhes } from './CategoriaDetalhes'
import { PeriodoSelector } from '../../PeriodoSelector'
import { formatCurrency } from '@/lib/utils/format-currency'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

async function getCategoriaData(
  categoria: string,
  searchParams?: { mes?: string; ano?: string }
) {
  const ctx = await getSessionContext()

  if (!ctx) {
    redirect('/dashboard/financeiro')
  }

  // Obtém o período selecionado ou usa o mês atual
  const now = new Date()
  const mesSelecionado = searchParams?.mes ? parseInt(searchParams.mes) : now.getMonth() + 1
  const anoSelecionado = searchParams?.ano ? parseInt(searchParams.ano) : now.getFullYear()

  const startOfMonth = new Date(anoSelecionado, mesSelecionado - 1, 1)
  const endOfMonth = new Date(anoSelecionado, mesSelecionado, 0)

  // Busca todas as transações da categoria
  const todasTransacoes = await getFinanceiroByCategoryRecordsForContext(
    ctx,
    categoria,
    startOfMonth.toISOString().split('T')[0],
    endOfMonth.toISOString().split('T')[0]
  )

  // Separa despesas e receitas
  const despesas = todasTransacoes.filter((t) => t.transaction_type === 'expense')
  const receitas = todasTransacoes.filter((t) => t.transaction_type === 'revenue')

  // Calcula totais
  const totalDespesas = despesas.reduce((sum, d) => sum + Number(d.amount), 0)
  const totalReceitas = receitas.reduce((sum, r) => sum + Number(r.amount), 0)
  const saldo = totalReceitas - totalDespesas

  // Ordena por data (mais recente primeiro)
  const transacoesOrdenadas = [...todasTransacoes].sort((a, b) => {
    const dateA = new Date(a.date).getTime()
    const dateB = new Date(b.date).getTime()
    if (dateA !== dateB) return dateB - dateA
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  return {
    categoria,
    despesas,
    receitas,
    todasTransacoes: transacoesOrdenadas,
    totalDespesas,
    totalReceitas,
    saldo,
    periodoAtual: { mes: mesSelecionado, ano: anoSelecionado },
  }
}

export default async function CategoriaDetalhesPage({
  params,
  searchParams,
}: {
  params: Promise<{ categoria: string }>
  searchParams?: Promise<{ mes?: string; ano?: string }>
}) {
  const { categoria } = await params
  const paramsSearch = searchParams ? await searchParams : undefined
  const categoriaDecoded = decodeURIComponent(categoria)
  const data = await getCategoriaData(categoriaDecoded, paramsSearch)

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/financeiro"
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="Voltar para Financeiro"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Categoria: {categoriaDecoded}
          </h1>
          <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600">
            Detalhes das transações desta categoria
          </p>
        </div>
      </div>

      {/* Seletor de Período */}
      <Suspense
        fallback={
          <div className="bg-white rounded-lg shadow-sm sm:shadow p-4 sm:p-6 animate-pulse">
            <div className="h-10 bg-gray-200 rounded w-64"></div>
          </div>
        }
      >
        <PeriodoSelector basePath={`/dashboard/financeiro/categoria/${encodeURIComponent(categoriaDecoded)}`} />
      </Suspense>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:gap-6 sm:grid-cols-3">
        {/* Despesas */}
        <div className="bg-white rounded-lg shadow-sm sm:shadow p-4 sm:p-6">
          <p className="text-xs sm:text-sm font-medium text-gray-500">Total de Despesas</p>
          <p className="text-2xl sm:text-3xl font-bold text-red-600 mt-1 sm:mt-2 wrap-break-word">
            {formatCurrency(data.totalDespesas)}
          </p>
          <p className="text-xs sm:text-sm text-gray-500 mt-1 sm:mt-2">
            {data.despesas.length} {data.despesas.length === 1 ? 'despesa' : 'despesas'}
          </p>
        </div>

        {/* Receitas */}
        <div className="bg-white rounded-lg shadow-sm sm:shadow p-4 sm:p-6">
          <p className="text-xs sm:text-sm font-medium text-gray-500">Total de Receitas</p>
          <p className="text-2xl sm:text-3xl font-bold text-green-600 mt-1 sm:mt-2 wrap-break-word">
            {formatCurrency(data.totalReceitas)}
          </p>
          <p className="text-xs sm:text-sm text-gray-500 mt-1 sm:mt-2">
            {data.receitas.length} {data.receitas.length === 1 ? 'receita' : 'receitas'}
          </p>
        </div>

        {/* Saldo */}
        <div className="bg-white rounded-lg shadow-sm sm:shadow p-4 sm:p-6">
          <p className="text-xs sm:text-sm font-medium text-gray-500">Saldo</p>
          <p
            className={`text-2xl sm:text-3xl font-bold mt-1 sm:mt-2 wrap-break-word ${
              data.saldo >= 0 ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {data.saldo >= 0 ? '+' : ''}
            {formatCurrency(data.saldo)}
          </p>
          <p className="text-xs sm:text-sm text-gray-500 mt-1 sm:mt-2">
            {data.todasTransacoes.length} {data.todasTransacoes.length === 1 ? 'transação' : 'transações'}
          </p>
        </div>
      </div>

      {/* Lista de Transações */}
      <CategoriaDetalhes
        categoria={categoriaDecoded}
        transacoes={data.todasTransacoes}
        periodoAtual={data.periodoAtual}
      />
    </div>
  )
}
