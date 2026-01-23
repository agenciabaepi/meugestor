'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, Trash2, X, User, Building2, Phone, Mail, MapPin, FileText } from 'lucide-react'
import Link from 'next/link'
import type { Financeiro } from '@/lib/db/types'
import { Dialog, DialogActions, useToast } from '@/app/components/ui'
import { CurrencyInput } from '@/app/components/ui/CurrencyInput'

interface EditarTransacaoProps {
  transacao: Financeiro
}

export function EditarTransacao({ transacao }: EditarTransacaoProps) {
  const router = useRouter()
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const [formData, setFormData] = useState({
    description: transacao.description || '',
    amount: Number(transacao.amount) || 0,
    category: transacao.category || '',
    subcategory: transacao.subcategory || '',
    date: transacao.date || '',
    transactionType: (transacao as any).transaction_type || 'expense',
    pago: transacao.pago !== undefined ? transacao.pago : true,
  })

  const [fornecedorDetalhes, setFornecedorDetalhes] = useState<any>(null)
  const [funcionarioDetalhes, setFuncionarioDetalhes] = useState<any>(null)
  const [loadingDetalhes, setLoadingDetalhes] = useState(false)

  // Verifica se a categoria é de fornecedores ou funcionários
  const isFornecedoresCategory = (category: string): boolean => {
    if (!category) return false
    const normalized = category.toLowerCase().trim()
    return normalized === 'fornecedores' || normalized === 'fornecedor'
  }

  const isFuncionariosCategory = (category: string): boolean => {
    if (!category) return false
    const normalized = category.toLowerCase().trim()
    return (
      normalized === 'funcionarios' ||
      normalized === 'funcionário' ||
      normalized === 'funcionario' ||
      normalized === 'funcionários'
    )
  }

  // Busca detalhes do fornecedor ou funcionário
  useEffect(() => {
    const fetchDetalhes = async () => {
      const metadata = transacao.metadata || {}
      const funcionarioId = (transacao as any).funcionario_id

      if (isFornecedoresCategory(transacao.category)) {
        // Busca fornecedor do metadata
        if (metadata.fornecedor && metadata.fornecedor.id) {
          setLoadingDetalhes(true)
          try {
            const response = await fetch(`/api/fornecedores/${metadata.fornecedor.id}`)
            if (response.ok) {
              const data = await response.json()
              setFornecedorDetalhes(data.fornecedor)
            }
          } catch (error) {
            console.error('Erro ao buscar fornecedor:', error)
          } finally {
            setLoadingDetalhes(false)
          }
        }
      } else if (isFuncionariosCategory(transacao.category) && funcionarioId) {
        // Busca funcionário pelo ID
        setLoadingDetalhes(true)
        try {
          const response = await fetch(`/api/funcionarios/${funcionarioId}`)
          if (response.ok) {
            const data = await response.json()
            setFuncionarioDetalhes(data.funcionario)
          }
        } catch (error) {
          console.error('Erro ao buscar funcionário:', error)
        } finally {
          setLoadingDetalhes(false)
        }
      }
    }

    fetchDetalhes()
  }, [transacao]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch(`/api/financeiro/${transacao.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const error = await response.json()
        toast.error('Erro ao atualizar', error.error || 'Não foi possível atualizar a transação.')
        return
      }

      toast.success('Transação atualizada', 'As alterações foram salvas com sucesso.')
      router.push('/dashboard/financeiro')
      router.refresh()
    } catch (error) {
      console.error('Error updating transacao:', error)
      toast.error('Erro ao atualizar', 'Ocorreu um erro ao tentar atualizar a transação.')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    setShowDeleteConfirm(true)
  }

  const confirmDelete = async () => {
    setLoading(true)
    setShowDeleteConfirm(false)

    try {
      const response = await fetch(`/api/financeiro/${transacao.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        toast.error('Erro ao excluir', error.error || 'Não foi possível excluir a transação.')
        setLoading(false)
        return
      }

      toast.success('Transação excluída', 'A transação foi removida com sucesso.')
      router.push('/dashboard/financeiro')
      router.refresh()
    } catch (error) {
      console.error('Error deleting transacao:', error)
      toast.error('Erro ao excluir', 'Ocorreu um erro ao tentar excluir a transação.')
      setLoading(false)
    }
  }

  const isReceita = formData.transactionType === 'revenue'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/financeiro"
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Editar Transação
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              {isReceita ? 'Receita' : 'Despesa'}
            </p>
          </div>
        </div>

        <button
          onClick={handleDelete}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
        >
          <Trash2 className="w-4 h-4" />
          <span className="text-sm font-medium">Excluir</span>
        </button>
      </div>

      {/* Detalhes do Fornecedor ou Funcionário */}
      {(fornecedorDetalhes || funcionarioDetalhes) && (
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            {fornecedorDetalhes ? (
              <Building2 className="w-6 h-6 text-emerald-600" />
            ) : (
              <User className="w-6 h-6 text-emerald-600" />
            )}
            <h2 className="text-lg font-semibold text-gray-900">
              {fornecedorDetalhes ? 'Detalhes do Fornecedor' : 'Detalhes do Funcionário'}
            </h2>
          </div>

          {loadingDetalhes ? (
            <div className="text-gray-500 text-sm">Carregando detalhes...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Nome */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                  {fornecedorDetalhes ? (
                    <Building2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <User className="w-4 h-4 text-emerald-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 mb-1">Nome</p>
                  <p className="text-sm font-medium text-gray-900">
                    {fornecedorDetalhes?.nome || funcionarioDetalhes?.nome_original || 'N/A'}
                  </p>
                </div>
              </div>

              {/* Telefone */}
              {(fornecedorDetalhes?.telefone || funcionarioDetalhes?.telefone) && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                    <Phone className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500 mb-1">Telefone</p>
                    <p className="text-sm font-medium text-gray-900">
                      {fornecedorDetalhes?.telefone || funcionarioDetalhes?.telefone}
                    </p>
                  </div>
                </div>
              )}

              {/* Email */}
              {(fornecedorDetalhes?.email || funcionarioDetalhes?.email) && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500 mb-1">E-mail</p>
                    <p className="text-sm font-medium text-gray-900 break-words">
                      {fornecedorDetalhes?.email || funcionarioDetalhes?.email}
                    </p>
                  </div>
                </div>
              )}

              {/* Endereço (apenas fornecedor) */}
              {fornecedorDetalhes?.endereco && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500 mb-1">Endereço</p>
                    <p className="text-sm font-medium text-gray-900 break-words">
                      {fornecedorDetalhes.endereco}
                    </p>
                  </div>
                </div>
              )}

              {/* CNPJ (apenas fornecedor) */}
              {fornecedorDetalhes?.cnpj && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500 mb-1">CNPJ</p>
                    <p className="text-sm font-medium text-gray-900">
                      {fornecedorDetalhes.cnpj}
                    </p>
                  </div>
                </div>
              )}

              {/* Observação */}
              {(fornecedorDetalhes?.observacao || funcionarioDetalhes?.observacao) && (
                <div className="flex items-start gap-3 md:col-span-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500 mb-1">Observação</p>
                    <p className="text-sm font-medium text-gray-900 break-words">
                      {fornecedorDetalhes?.observacao || funcionarioDetalhes?.observacao}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Formulário */}
      <div className="bg-white rounded-lg shadow-sm sm:shadow p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Tipo de Transação */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="transactionType"
                  value="expense"
                  checked={formData.transactionType === 'expense'}
                  onChange={(e) =>
                    setFormData({ ...formData, transactionType: e.target.value as 'expense' | 'revenue' })
                  }
                  className="text-red-600"
                />
                <span className="text-sm text-gray-700">Despesa</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="transactionType"
                  value="revenue"
                  checked={formData.transactionType === 'revenue'}
                  onChange={(e) =>
                    setFormData({ ...formData, transactionType: e.target.value as 'expense' | 'revenue' })
                  }
                  className="text-green-600"
                />
                <span className="text-sm text-gray-700">Receita</span>
              </label>
            </div>
          </div>

          {/* Descrição */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Título / Descrição *
            </label>
            <input
              type="text"
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              placeholder="Ex: Compra de materiais"
            />
          </div>

          {/* Valor */}
          <CurrencyInput
            label="Valor"
            required
            value={formData.amount}
            onChange={(value) => setFormData({ ...formData, amount: value })}
            placeholder="0,00"
          />

          {/* Categoria */}
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
              Categoria *
            </label>
            <input
              type="text"
              id="category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              placeholder="Ex: Materiais"
            />
          </div>

          {/* Data */}
          <div>
            <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
              Data *
            </label>
            <input
              type="date"
              id="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            />
          </div>

          {/* Status de Pagamento (apenas para despesas) */}
          {!isReceita && (
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <input
                type="checkbox"
                id="pago"
                checked={formData.pago}
                onChange={(e) => setFormData({ ...formData, pago: e.target.checked })}
                className="w-5 h-5 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500 focus:ring-2 cursor-pointer"
              />
              <label htmlFor="pago" className="text-sm font-medium text-gray-700 cursor-pointer flex-1">
                Marcar como pago
              </label>
              {!formData.pago && (
                <span className="text-xs text-orange-600 font-medium">(Pendente de pagamento)</span>
              )}
            </div>
          )}

          {/* Botões */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <Link
              href="/dashboard/financeiro"
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'Salvando...' : 'Salvar'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Dialog de Confirmação de Exclusão */}
      <Dialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Confirmar exclusão"
        description="Esta ação não pode ser desfeita."
        size="sm"
      >
        <p className="text-gray-700 mb-4">
          Tem certeza que deseja excluir esta transação?
          <span className="block mt-2 text-sm text-gray-500">
            "{transacao.description}"
          </span>
        </p>

        <DialogActions>
          <button
            onClick={() => setShowDeleteConfirm(false)}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={confirmDelete}
            disabled={loading}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Excluindo...' : 'Excluir'}
          </button>
        </DialogActions>
      </Dialog>
    </div>
  )
}