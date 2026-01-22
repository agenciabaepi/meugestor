'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Edit2, Trash2 } from 'lucide-react'
import type { Financeiro } from '@/lib/db/types'
import { Dialog, DialogActions, useToast } from '@/app/components/ui'
import { formatCurrency } from '@/lib/utils/format-currency'

interface CategoriaDetalhesProps {
  categoria: string
  transacoes: Financeiro[]
  periodoAtual: { mes: number; ano: number }
}

export function CategoriaDetalhes({
  categoria,
  transacoes,
  periodoAtual,
}: CategoriaDetalhesProps) {
  const router = useRouter()
  const toast = useToast()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [transacaoToDelete, setTransacaoToDelete] = useState<Financeiro | null>(null)

  const handleDelete = async (transacao: Financeiro) => {
    setTransacaoToDelete(transacao)
    setDeleteConfirmOpen(true)
  }

  const confirmDelete = async () => {
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
  }

  if (transacoes.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm sm:shadow p-6 sm:p-8 text-center">
        <p className="text-gray-500 text-sm sm:text-base">
          Nenhuma transação encontrada para a categoria "{categoria}" em{' '}
          {new Date(periodoAtual.ano, periodoAtual.mes - 1, 1).toLocaleDateString('pt-BR', {
            month: 'long',
            year: 'numeric',
          })}
          .
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm sm:shadow">
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900">
            Transações ({transacoes.length})
          </h2>
        </div>
        <div className="p-3 sm:p-4 lg:p-6">
          <div className="space-y-1.5">
            {transacoes.map((transacao) => {
              const isReceita = transacao.transaction_type === 'revenue'
              const metadata = transacao.metadata || {}
              const fornecedor = metadata.fornecedor || null

              // Data e hora
              const dateParts = transacao.date.split('-')
              const date = new Date(
                parseInt(dateParts[0]),
                parseInt(dateParts[1]) - 1,
                parseInt(dateParts[2])
              )
              const createdAt = transacao.created_at ? new Date(transacao.created_at) : date
              const dataFormatada = date.toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              })
              const horaFormatada = createdAt.toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
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
                  <div
                    className={`w-1 h-12 rounded-full shrink-0 ${
                      isReceita ? 'bg-green-500' : 'bg-red-500'
                    }`}
                  />

                  {/* Conteúdo */}
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
                            <span
                              className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                transacao.pago !== false
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-orange-100 text-orange-800'
                              }`}
                            >
                              {transacao.pago !== false ? '✓ Pago' : '⏳ Pendente'}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0">
                        <p
                          className={`font-semibold text-sm whitespace-nowrap ${
                            isReceita ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {isReceita ? '+' : '-'}
                          {formatCurrency(Number(transacao.amount))}
                        </p>
                      </div>
                    </div>

                    {/* Segunda linha: Informações */}
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 flex-wrap">
                      <span>
                        {dataFormatada} {horaFormatada}
                      </span>
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
                      {transacao.tags && transacao.tags.length > 0 && (
                        <>
                          <span className="text-gray-300">•</span>
                          <span className="text-gray-400">
                            {transacao.tags.slice(0, 2).map((tag) => `#${tag}`).join(' ')}
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
                        handleDelete(transacao)
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
            onClick={confirmDelete}
            disabled={deletingId === transacaoToDelete?.id}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {deletingId === transacaoToDelete?.id ? 'Excluindo...' : 'Excluir'}
          </button>
        </DialogActions>
      </Dialog>
    </>
  )
}
