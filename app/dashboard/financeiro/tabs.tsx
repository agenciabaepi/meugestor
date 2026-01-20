'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Edit2, Trash2 } from 'lucide-react'
import { Charts } from './charts'
import type { Financeiro } from '@/lib/db/types'
import { Dialog, DialogActions, useToast } from '@/app/components/ui'
import { formatCurrency } from '@/lib/utils/format-currency'

interface FinanceiroTabsProps {
  despesas: Financeiro[]
  receitas: Financeiro[]
  todasTransacoes: Financeiro[]
  dadosGraficoDespesas: Array<{ date: string; total: number }>
  dadosGraficoReceitas: Array<{ date: string; total: number }>
}

export function FinanceiroTabs({
  despesas,
  receitas,
  todasTransacoes,
  dadosGraficoDespesas,
  dadosGraficoReceitas,
}: FinanceiroTabsProps) {
  const router = useRouter()
  const toast = useToast()
  const [activeTab, setActiveTab] = useState<'todos' | 'despesas' | 'receitas'>('todos')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [transacaoToDelete, setTransacaoToDelete] = useState<Financeiro | null>(null)
  const [funcionariosInfo, setFuncionariosInfo] = useState<Record<string, { nome: string }>>({})

  // Busca informações dos funcionários
  useEffect(() => {
    const funcionarioIds = new Set<string>()
    todasTransacoes.forEach((transacao) => {
      const funcionarioId = (transacao as any).funcionario_id
      if (funcionarioId) {
        funcionarioIds.add(funcionarioId)
      }
    })

    if (funcionarioIds.size > 0) {
      Promise.all(
        Array.from(funcionarioIds).map(async (id) => {
          try {
            const response = await fetch(`/api/funcionarios/${id}`)
            if (response.ok) {
              const data = await response.json()
              return { id, nome: data.funcionario?.nome_original || 'Funcionário desconhecido' }
            }
          } catch (error) {
            console.error('Erro ao buscar funcionário:', error)
          }
          return null
        })
      ).then((results) => {
        const info: Record<string, { nome: string }> = {}
        results.forEach((r) => {
          if (r) info[r.id] = { nome: r.nome }
        })
        setFuncionariosInfo(info)
      })
    }
  }, [todasTransacoes])

  const getCurrentData = () => {
    switch (activeTab) {
      case 'despesas':
        return despesas
      case 'receitas':
        return receitas
      default:
        return todasTransacoes
    }
  }

  const getCurrentCharts = () => {
    switch (activeTab) {
      case 'despesas':
        return {
          dadosGrafico: dadosGraficoDespesas,
        }
      case 'receitas':
        return {
          dadosGrafico: dadosGraficoReceitas,
        }
      default:
        // Para "todos", combina os dados
        const dadosGraficoCombinados = dadosGraficoDespesas.map((item, index) => ({
          date: item.date,
          total: item.total + (dadosGraficoReceitas[index]?.total || 0),
        }))
        return {
          dadosGrafico: dadosGraficoCombinados,
        }
    }
  }

  const currentData = getCurrentData()
  const currentCharts = getCurrentCharts()
  const title = activeTab === 'despesas' ? 'Despesas' : activeTab === 'receitas' ? 'Receitas' : 'Todas as Transações'

  return (
    <div className="space-y-4 sm:space-y-6 w-full overflow-x-hidden">
      {/* Abas */}
      <div className="bg-white rounded-lg shadow-sm sm:shadow overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('todos')}
              className={`
                flex-1 px-2 sm:px-4 py-3 text-center text-xs sm:text-sm font-medium border-b-2 transition-colors touch-manipulation
                ${activeTab === 'todos'
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
              style={{ minHeight: '44px' }}
            >
              <span className="block sm:inline">Todas</span>
              <span className="block sm:inline">({todasTransacoes.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('receitas')}
              className={`
                flex-1 px-2 sm:px-4 py-3 text-center text-xs sm:text-sm font-medium border-b-2 transition-colors touch-manipulation
                ${activeTab === 'receitas'
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
              style={{ minHeight: '44px' }}
            >
              <span className="block sm:inline">Receitas</span>
              <span className="block sm:inline">({receitas.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('despesas')}
              className={`
                flex-1 px-2 sm:px-4 py-3 text-center text-xs sm:text-sm font-medium border-b-2 transition-colors touch-manipulation
                ${activeTab === 'despesas'
                  ? 'border-red-600 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
              style={{ minHeight: '44px' }}
            >
              <span className="block sm:inline">Despesas</span>
              <span className="block sm:inline">({despesas.length})</span>
            </button>
          </nav>
        </div>
      </div>

      {/* Gráficos */}
      <Charts 
        dadosGrafico={currentCharts.dadosGrafico}
        tituloGrafico={
          activeTab === 'despesas' 
            ? 'Despesas dos Últimos 7 Dias'
            : activeTab === 'receitas'
            ? 'Receitas dos Últimos 7 Dias'
            : 'Transações dos Últimos 7 Dias'
        }
      />

      {/* Lista de Transações */}
      <div id="financeiro-transacoes" className="bg-white rounded-lg shadow-sm sm:shadow">
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900">
            {title} do Mês
          </h2>
        </div>
        <div className="p-3 sm:p-4 lg:p-6">
          {currentData.length > 0 ? (
            <div className="space-y-1.5">
              {currentData.map((transacao) => {
                // Fallback: se transaction_type não existir, assume despesa (comportamento antigo)
                const isReceita = (transacao as any).transaction_type === 'revenue'
                
                // Extrai informações do metadata e funcionario_id
                const metadata = transacao.metadata || {}
                const fornecedor = metadata.fornecedor || null
                const funcionarioId = (transacao as any).funcionario_id || null
                
                // Data e hora: usa created_at para hora, date para data
                const date = new Date(transacao.date)
                const createdAt = transacao.created_at ? new Date(transacao.created_at) : date
                const dataFormatada = date.toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric'
                })
                const horaFormatada = createdAt.toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit'
                })
                
                const isDeleting = deletingId === transacao.id

                return (
                  <div
                    key={transacao.id}
                    className={`flex items-center gap-3 p-2.5 sm:p-3 rounded-md hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                      isDeleting ? 'opacity-50' : ''
                    }`}
                  >
                    {/* Indicador lateral */}
                    <div className={`w-1 h-12 rounded-full shrink-0 ${
                      isReceita ? 'bg-green-500' : 'bg-red-500'
                    }`} />

                    {/* Conteúdo - linha clicável (evita <a> dentro de <a>) */}
                    <div
                      role="link"
                      tabIndex={0}
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => router.push(`/dashboard/financeiro/${transacao.id}`)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          router.push(`/dashboard/financeiro/${transacao.id}`)
                        }
                      }}
                    >
                      {/* Primeira linha: Descrição e Valor */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {transacao.description}
                            </p>
                            {/* Badge de status de pagamento (apenas para despesas) */}
                            {!isReceita && (
                              <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                transacao.pago !== false
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-orange-100 text-orange-800'
                              }`}>
                                {transacao.pago !== false ? '✓ Pago' : '⏳ Pendente'}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="shrink-0">
                          <p className={`font-semibold text-sm whitespace-nowrap ${
                            isReceita ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {isReceita ? '+' : '-'}{formatCurrency(Number(transacao.amount))}
                          </p>
                        </div>
                      </div>

                      {/* Segunda linha: Informações compactas */}
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 flex-wrap">
                        <span>{dataFormatada} {horaFormatada}</span>
                        <span className="text-gray-300">•</span>
                        <span>{transacao.category}</span>
                        {transacao.subcategory && (
                          <>
                            <span className="text-gray-300">•</span>
                            <span>{transacao.subcategory}</span>
                          </>
                        )}
                        {fornecedor && fornecedor.nome && (
                          <>
                            <span className="text-gray-300">•</span>
                            <span className="text-gray-600 font-medium">🏢 {fornecedor.nome}</span>
                          </>
                        )}
                        {funcionarioId && funcionariosInfo[funcionarioId] && (
                          <>
                            <span className="text-gray-300">•</span>
                            <button
                              type="button"
                              className="text-emerald-600 font-medium hover:text-emerald-700 hover:underline"
                              onClick={(e) => {
                                e.stopPropagation()
                                router.push('/dashboard/funcionarios')
                              }}
                            >
                              👤 {funcionariosInfo[funcionarioId].nome}
                            </button>
                          </>
                        )}
                        {transacao.tags && transacao.tags.length > 0 && (
                          <>
                            <span className="text-gray-300">•</span>
                            <span className="text-gray-400">
                              {transacao.tags.slice(0, 2).map(tag => `#${tag}`).join(' ')}
                              {transacao.tags.length > 2 && ` +${transacao.tags.length - 2}`}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Botões de Ação */}
                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        href={`/dashboard/financeiro/${transacao.id}`}
                        className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        onClick={(e) => e.stopPropagation()}
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          e.preventDefault()
                          setTransacaoToDelete(transacao)
                          setDeleteConfirmOpen(true)
                        }}
                        disabled={isDeleting}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-6 sm:py-8 text-sm sm:text-base">
              {activeTab === 'despesas' && 'Nenhuma despesa registrada este mês'}
              {activeTab === 'receitas' && 'Nenhuma receita registrada este mês'}
              {activeTab === 'todos' && 'Nenhuma transação registrada este mês'}
            </p>
          )}
        </div>
      </div>

      {/* Dialog de Confirmação de Exclusão */}
      <Dialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Confirmar exclusão"
        description="Esta ação não pode ser desfeita."
        size="sm"
      >
        <p className="text-gray-700 mb-4">
          Tem certeza que deseja excluir esta transação?
          {transacaoToDelete && (
            <span className="block mt-2 text-sm text-gray-500">
              "{transacaoToDelete.description}"
            </span>
          )}
        </p>

        <DialogActions>
          <button
            onClick={() => {
              setDeleteConfirmOpen(false)
              setTransacaoToDelete(null)
            }}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={async () => {
              if (!transacaoToDelete) return
              
              setDeletingId(transacaoToDelete.id)
              setDeleteConfirmOpen(false)
              
              try {
                const response = await fetch(`/api/financeiro/${transacaoToDelete.id}`, {
                  method: 'DELETE',
                })
                
                if (response.ok) {
                  toast.success('Transação excluída', 'A transação foi removida com sucesso.')
                  router.refresh()
                } else {
                  const error = await response.json()
                  toast.error('Erro ao excluir', error.error || 'Não foi possível excluir a transação.')
                  setDeletingId(null)
                }
              } catch (error) {
                console.error('Error deleting transacao:', error)
                toast.error('Erro ao excluir', 'Ocorreu um erro ao tentar excluir a transação.')
                setDeletingId(null)
              } finally {
                setTransacaoToDelete(null)
              }
            }}
            disabled={deletingId === transacaoToDelete?.id}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {deletingId === transacaoToDelete?.id ? 'Excluindo...' : 'Excluir'}
          </button>
        </DialogActions>
      </Dialog>
    </div>
  )
}
