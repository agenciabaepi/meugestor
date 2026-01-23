'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, Clock, AlertCircle, Edit2, Trash2, DollarSign, Calendar } from 'lucide-react'
import type { Financeiro } from '@/lib/db/types'
import { Dialog, DialogActions, useToast } from '@/app/components/ui'
import { formatCurrency } from '@/lib/utils/format-currency'

interface ContasAReceberClientProps {
  contasAReceber: Financeiro[]
  totalPendente: number
}

export function ContasAReceberClient({ contasAReceber: initialContasAReceber, totalPendente: initialTotal }: ContasAReceberClientProps) {
  const router = useRouter()
  const toast = useToast()
  const [contasAReceber, setContasAReceber] = useState(initialContasAReceber)
  const [loading, setLoading] = useState<string | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [contaToDelete, setContaToDelete] = useState<Financeiro | null>(null)

  const formatDate = (date: string) => {
    // Evita problemas de timezone ao criar a data a partir de uma string YYYY-MM-DD
    const dateParts = date.split('-')
    const dateObj = new Date(
      parseInt(dateParts[0]), // ano
      parseInt(dateParts[1]) - 1, // mês (0-indexed)
      parseInt(dateParts[2]) // dia
    )
    return dateObj.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  const isAtrasada = (date: string) => {
    // Pega apenas a parte da data (YYYY-MM-DD) para evitar problemas de timezone
    const hoje = new Date()
    const hojeStr = hoje.toISOString().split('T')[0]
    
    // Se a data vier no formato YYYY-MM-DD, usa diretamente
    const dataPrevistaStr = date.includes('T') ? date.split('T')[0] : date
    
    // Compara strings de data (YYYY-MM-DD)
    return dataPrevistaStr < hojeStr
  }

  const handleMarcarComoRecebido = async (conta: Financeiro) => {
    setLoading(conta.id)
    try {
      const response = await fetch(`/api/financeiro/${conta.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...conta,
          pago: true,
        }),
      })

      if (response.ok) {
        toast.success('Conta marcada como recebida', 'A conta foi atualizada com sucesso.')
        router.refresh()
        setContasAReceber(contasAReceber.filter(c => c.id !== conta.id))
      } else {
        const error = await response.json()
        toast.error('Erro ao atualizar', error.error || 'Não foi possível marcar a conta como recebida.')
      }
    } catch (error) {
      console.error('Erro ao marcar como recebido:', error)
      toast.error('Erro ao atualizar', 'Ocorreu um erro ao tentar atualizar a conta.')
    } finally {
      setLoading(null)
    }
  }

  const handleDelete = (conta: Financeiro) => {
    setContaToDelete(conta)
    setDeleteConfirmOpen(true)
  }

  const confirmDelete = async () => {
    if (!contaToDelete) return

    setLoading(contaToDelete.id)
    setDeleteConfirmOpen(false)

    try {
      const response = await fetch(`/api/financeiro/${contaToDelete.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Conta excluída', 'A conta foi removida com sucesso.')
        router.refresh()
        setContasAReceber(contasAReceber.filter(c => c.id !== contaToDelete.id))
      } else {
        const error = await response.json()
        toast.error('Erro ao excluir', error.error || 'Não foi possível excluir a conta.')
      }
    } catch (error) {
      console.error('Erro ao excluir conta:', error)
      toast.error('Erro ao excluir', 'Ocorreu um erro ao tentar excluir a conta.')
    } finally {
      setLoading(null)
      setContaToDelete(null)
    }
  }

  const atrasadas = contasAReceber.filter(c => isAtrasada(c.date))
  const previstas = contasAReceber.filter(c => !isAtrasada(c.date))
  const totalAtrasadas = atrasadas.reduce((sum, c) => sum + Number(c.amount), 0)
  const totalPrevistas = previstas.reduce((sum, c) => sum + Number(c.amount), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Contas a Receber</h1>
        <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600 dark:text-gray-400">
          Gerencie suas receitas previstas para receber
        </p>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm sm:shadow p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">Total Pendente</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mt-1">
                {formatCurrency(initialTotal)}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm sm:shadow p-4 sm:p-6 border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">Atrasadas</p>
              <p className="text-2xl sm:text-3xl font-bold text-orange-600 mt-1">
                {atrasadas.length}
              </p>
              <p className="text-sm font-semibold text-orange-600 mt-1">
                {formatCurrency(totalAtrasadas)}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm sm:shadow p-4 sm:p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">Previstas</p>
              <p className="text-2xl sm:text-3xl font-bold text-blue-600 mt-1">
                {previstas.length}
              </p>
              <p className="text-sm font-semibold text-blue-600 mt-1">
                {formatCurrency(totalPrevistas)}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Contas Atrasadas */}
      {atrasadas.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm sm:shadow overflow-hidden border-l-4 border-orange-500">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-orange-50 dark:bg-orange-900/20">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              ⚠️ Contas Atrasadas ({atrasadas.length})
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Total: {formatCurrency(totalAtrasadas)}
            </p>
          </div>
          <div className="divide-y divide-gray-200">
            {atrasadas.map((conta) => (
              <div key={conta.id} className="p-4 sm:p-6 hover:bg-orange-50 dark:bg-orange-900/20/50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                        {conta.description}
                      </h3>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-orange-100 text-orange-800">
                        Atrasada
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 text-sm text-gray-600 dark:text-gray-400">
                      <div>
                        <span className="font-medium">Valor:</span>{' '}
                        <span className="text-gray-900 dark:text-white font-semibold">
                          {formatCurrency(Number(conta.amount))}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium">Categoria:</span> {conta.category}
                      </div>
                      <div>
                        <span className="font-medium">Previsão:</span>{' '}
                        <span className="text-orange-600 font-semibold">{formatDate(conta.date)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleMarcarComoRecebido(conta)}
                      disabled={loading === conta.id}
                      className="px-3 py-1.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Marcar como recebido"
                    >
                      <CheckCircle2 className="w-4 h-4 inline-block mr-1" />
                      <span className="hidden sm:inline">Receber</span>
                    </button>
                    <Link
                      href={`/dashboard/financeiro/${conta.id}`}
                      className="p-2 text-gray-600 dark:text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Edit2 className="w-5 h-5" />
                    </Link>
                    <button
                      onClick={() => handleDelete(conta)}
                      className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 hover:bg-red-50 dark:bg-red-900/20 rounded-lg transition-colors"
                      title="Excluir"
                      disabled={loading === conta.id}
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Receitas Previstas */}
      {previstas.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm sm:shadow overflow-hidden border-l-4 border-blue-500">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              📅 Receitas Previstas ({previstas.length})
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Total: {formatCurrency(totalPrevistas)}
            </p>
          </div>
          <div className="divide-y divide-gray-200">
            {previstas.map((conta) => (
              <div key={conta.id} className="p-4 sm:p-6 hover:bg-blue-50 dark:bg-blue-900/20/50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                        {conta.description}
                      </h3>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
                        Pendente
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 text-sm text-gray-600 dark:text-gray-400">
                      <div>
                        <span className="font-medium">Valor:</span>{' '}
                        <span className="text-gray-900 dark:text-white font-semibold">
                          {formatCurrency(Number(conta.amount))}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium">Categoria:</span> {conta.category}
                      </div>
                      <div>
                        <span className="font-medium">Previsão:</span>{' '}
                        <span className="text-blue-600 font-semibold">{formatDate(conta.date)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleMarcarComoRecebido(conta)}
                      disabled={loading === conta.id}
                      className="px-3 py-1.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Marcar como recebido"
                    >
                      <CheckCircle2 className="w-4 h-4 inline-block mr-1" />
                      <span className="hidden sm:inline">Receber</span>
                    </button>
                    <Link
                      href={`/dashboard/financeiro/${conta.id}`}
                      className="p-2 text-gray-600 dark:text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Edit2 className="w-5 h-5" />
                    </Link>
                    <button
                      onClick={() => handleDelete(conta)}
                      className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 hover:bg-red-50 dark:bg-red-900/20 rounded-lg transition-colors"
                      title="Excluir"
                      disabled={loading === conta.id}
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mensagem quando não há contas */}
      {contasAReceber.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm sm:shadow p-8 sm:p-12 text-center">
          <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Nenhuma conta a receber
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Todas as suas receitas foram recebidas!
          </p>
          <Link
            href="/dashboard/financeiro"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
          >
            <DollarSign className="w-5 h-5" />
            Ir para Financeiro
          </Link>
        </div>
      )}

      {/* Dialog de Confirmação de Exclusão */}
      <Dialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Confirmar exclusão"
        description="Esta ação não pode ser desfeita."
        size="sm"
      >
        <p className="text-gray-700 mb-4">
          Tem certeza que deseja excluir esta conta?
          {contaToDelete && (
            <span className="block mt-2 text-sm text-gray-500 dark:text-gray-400">
              "{contaToDelete.description}"
            </span>
          )}
        </p>

        <DialogActions>
          <button
            onClick={() => {
              setDeleteConfirmOpen(false)
              setContaToDelete(null)
            }}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={confirmDelete}
            disabled={loading === contaToDelete?.id}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {loading === contaToDelete?.id ? 'Excluindo...' : 'Excluir'}
          </button>
        </DialogActions>
      </Dialog>
    </div>
  )
}
