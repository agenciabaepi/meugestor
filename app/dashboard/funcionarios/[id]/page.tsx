import { getSessionContext } from '@/lib/utils/session-context'
import { redirect } from 'next/navigation'
import { getFuncionariosByEmpresa } from '@/lib/db/queries-empresa'
import { getFinanceiroEmpresaByFuncionario } from '@/lib/db/queries-empresa'
import { FuncionarioDetalhes } from './FuncionarioDetalhes'
import { formatCurrency } from '@/lib/utils/format-currency'
import { ArrowLeft, User, Briefcase, DollarSign, Calendar } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

async function getFuncionarioData(funcionarioId: string) {
  const ctx = await getSessionContext()

  if (!ctx || ctx.mode !== 'empresa' || !ctx.empresa_id) {
    redirect('/dashboard/funcionarios')
  }

  // Busca funcionário
  const funcionarios = await getFuncionariosByEmpresa(ctx.tenant_id, ctx.empresa_id)
  const funcionario = funcionarios.find((f) => f.id === funcionarioId)

  if (!funcionario) {
    redirect('/dashboard/funcionarios')
  }

  // Busca todos os pagamentos do funcionário (sem filtro de data)
  const pagamentos = await getFinanceiroEmpresaByFuncionario(
    ctx.tenant_id,
    ctx.empresa_id,
    funcionarioId,
    undefined,
    undefined
  )

  // Filtra apenas despesas (pagamentos)
  const pagamentosFiltrados = pagamentos.filter((p) => p.transaction_type === 'expense')

  // Calcula totais
  const totalGeral = pagamentosFiltrados.reduce((sum, p) => sum + Number(p.amount), 0)
  
  // Calcula total do mês atual
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const pagamentosMesAtual = pagamentosFiltrados.filter((p) => {
    const pagamentoDate = new Date(p.date)
    return pagamentoDate >= startOfMonth && pagamentoDate <= endOfMonth
  })
  const totalMesAtual = pagamentosMesAtual.reduce((sum, p) => sum + Number(p.amount), 0)

  // Ordena por data (mais recente primeiro)
  // Compara strings diretamente (YYYY-MM-DD) para evitar problemas de timezone
  const pagamentosOrdenados = [...pagamentosFiltrados].sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date)
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  return {
    funcionario,
    pagamentos: pagamentosOrdenados,
    totalGeral,
    totalMesAtual,
    quantidadePagamentos: pagamentosFiltrados.length,
  }
}

export default async function FuncionarioDetalhesPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const data = await getFuncionarioData(id)

  const getTipoLabel = (tipo: string | null) => {
    switch (tipo) {
      case 'fixo':
        return 'Fixo (CLT)'
      case 'freelancer':
        return 'Freelancer'
      case 'temporario':
        return 'Temporário'
      default:
        return '-'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/funcionarios"
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Voltar para Funcionários"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            {data.funcionario.nome_original}
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Histórico completo de pagamentos
          </p>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Geral */}
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-8 h-8 opacity-90" />
          </div>
          <p className="text-sm font-medium opacity-90 mb-1">Total Pago</p>
          <p className="text-3xl font-bold">{formatCurrency(data.totalGeral)}</p>
          <p className="text-xs opacity-75 mt-2">
            {data.quantidadePagamentos} {data.quantidadePagamentos === 1 ? 'pagamento' : 'pagamentos'}
          </p>
        </div>

        {/* Mês Atual */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <Calendar className="w-8 h-8 opacity-90" />
          </div>
          <p className="text-sm font-medium opacity-90 mb-1">Este Mês</p>
          <p className="text-3xl font-bold">{formatCurrency(data.totalMesAtual)}</p>
          <p className="text-xs opacity-75 mt-2">
            {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* Salário Base */}
        {data.funcionario.salario_base && (
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <User className="w-8 h-8 opacity-90" />
            </div>
            <p className="text-sm font-medium opacity-90 mb-1">Salário Base</p>
            <p className="text-3xl font-bold">{formatCurrency(data.funcionario.salario_base)}</p>
            <p className="text-xs opacity-75 mt-2">Valor de referência</p>
          </div>
        )}
      </div>

      {/* Informações do Funcionário */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <User className="w-5 h-5 text-emerald-600" />
          Informações do Funcionário
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {data.funcionario.cargo && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Briefcase className="w-4 h-4 text-gray-400" />
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Cargo
                </p>
              </div>
              <p className="text-base font-semibold text-gray-900 dark:text-white">
                {data.funcionario.cargo}
              </p>
            </div>
          )}
          {data.funcionario.tipo && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <User className="w-4 h-4 text-gray-400" />
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Tipo
                </p>
              </div>
              <p className="text-base font-semibold text-gray-900 dark:text-white">
                {getTipoLabel(data.funcionario.tipo)}
              </p>
            </div>
          )}
          {data.funcionario.salario_base && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-gray-400" />
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Salário Base
                </p>
              </div>
              <p className="text-base font-semibold text-gray-900 dark:text-white">
                {formatCurrency(data.funcionario.salario_base)}
              </p>
            </div>
          )}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-4 h-4" />
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Status
              </p>
            </div>
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                data.funcionario.ativo
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              {data.funcionario.ativo ? 'Ativo' : 'Inativo'}
            </span>
          </div>
        </div>
      </div>

      {/* Lista de Pagamentos */}
      <FuncionarioDetalhes funcionario={data.funcionario} pagamentos={data.pagamentos} />
    </div>
  )
}
