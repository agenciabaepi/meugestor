'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Edit2, Trash2, Users, TrendingUp, CheckCircle2, Circle, ChevronDown, ChevronUp, DollarSign } from 'lucide-react'
import type { Funcionario, Financeiro } from '@/lib/db/types'
import { PeriodoSelector } from './PeriodoSelector'
import { Dialog, DialogActions, useToast } from '@/app/components/ui'
import { CurrencyInput } from '@/app/components/ui/CurrencyInput'

interface FuncionariosClientProps {
  funcionarios: Funcionario[]
  mesSelecionado: number
  anoSelecionado: number
}

interface PagamentoInfo {
  mesAtualPago: boolean
  ultimoPagamento: Financeiro | null
  totalMes: number
  pagamentos: Financeiro[]
}

export function FuncionariosClient({ funcionarios: initialFuncionarios, mesSelecionado, anoSelecionado }: FuncionariosClientProps) {
  const router = useRouter()
  const toast = useToast()
  const [funcionarios, setFuncionarios] = useState(initialFuncionarios)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isPagamentoModalOpen, setIsPagamentoModalOpen] = useState(false)
  const [selectedFuncionario, setSelectedFuncionario] = useState<Funcionario | null>(null)
  const [expandedFuncionario, setExpandedFuncionario] = useState<string | null>(null)
  const [pagamentosInfo, setPagamentosInfo] = useState<Record<string, PagamentoInfo>>({})
  const [editingFuncionario, setEditingFuncionario] = useState<Funcionario | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [funcionarioToDelete, setFuncionarioToDelete] = useState<{ id: string; nome: string } | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    nome_original: '',
    cargo: '',
    salario_base: '',
    tipo: '' as '' | 'fixo' | 'freelancer' | 'temporario',
    remuneracao_tipo: 'mensal' as 'mensal' | 'quinzenal' | 'diaria',
    ativo: true,
  })
  const [pagamentoData, setPagamentoData] = useState({
    valor: '',
    data: new Date().toISOString().split('T')[0],
    observacao: '',
  })

  const fetchFuncionarios = async () => {
    try {
      const response = await fetch('/api/funcionarios')
      if (response.ok) {
        const data = await response.json()
        setFuncionarios(data.funcionarios || [])
      }
    } catch (error) {
      console.error('Erro ao buscar funcionários:', error)
    }
  }

  const fetchPagamentos = async (funcionarioId: string, mes?: number, ano?: number) => {
    try {
      // Usa o mês/ano fornecido ou o selecionado
      const mesParaBuscar = mes ?? mesSelecionado
      const anoParaBuscar = ano ?? anoSelecionado
      
      const startOfMonth = new Date(anoParaBuscar, mesParaBuscar - 1, 1)
      const endOfMonth = new Date(anoParaBuscar, mesParaBuscar, 0)

      const response = await fetch(
        `/api/funcionarios/${funcionarioId}/pagamentos?startDate=${startOfMonth.toISOString().split('T')[0]}&endDate=${endOfMonth.toISOString().split('T')[0]}`
      )
      if (response.ok) {
        const data = await response.json()
        const pagamentos = data.pagamentos || []
        const totalMes = pagamentos.reduce((sum: number, p: Financeiro) => sum + Number(p.amount), 0)
        const mesAtualPago = pagamentos.length > 0
        const ultimoPagamento = pagamentos.length > 0 ? pagamentos[0] : null

        setPagamentosInfo((prev) => ({
          ...prev,
          [funcionarioId]: {
            mesAtualPago,
            ultimoPagamento,
            totalMes,
            pagamentos,
          },
        }))
      }
    } catch (error) {
      console.error('Erro ao buscar pagamentos:', error)
    }
  }

  // Busca pagamentos de todos os funcionários ativos ao carregar ou quando o período muda
  useEffect(() => {
    // Busca pagamentos para todos os funcionários ativos
    const ativosList = funcionarios.filter((f) => f.ativo)
    ativosList.forEach((funcionario) => {
      fetchPagamentos(funcionario.id, mesSelecionado, anoSelecionado)
    })
  }, [funcionarios.length, mesSelecionado, anoSelecionado]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggleExpand = (funcionarioId: string) => {
    if (expandedFuncionario === funcionarioId) {
      setExpandedFuncionario(null)
    } else {
      setExpandedFuncionario(funcionarioId)
      fetchPagamentos(funcionarioId)
    }
  }

  const handleOpenPagamentoModal = (funcionario: Funcionario) => {
    setSelectedFuncionario(funcionario)
    setPagamentoData({
      valor:
        (funcionario as any).remuneracao_valor
          ? String((funcionario as any).remuneracao_valor)
          : funcionario.salario_base
            ? String(funcionario.salario_base)
            : '',
      data: new Date().toISOString().split('T')[0],
      observacao: '',
    })
    setIsPagamentoModalOpen(true)
  }

  const handleClosePagamentoModal = () => {
    setIsPagamentoModalOpen(false)
    setSelectedFuncionario(null)
    setPagamentoData({
      valor: '',
      data: new Date().toISOString().split('T')[0],
      observacao: '',
    })
  }

  const handleRegistrarPagamento = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedFuncionario) return

    if (!pagamentoData.valor || Number(pagamentoData.valor) <= 0) {
      toast.error('Valor inválido', 'O valor deve ser maior que zero.')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/funcionarios/${selectedFuncionario.id}/pagamentos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          valor: Number(pagamentoData.valor),
          data: pagamentoData.data,
          observacao: pagamentoData.observacao || null,
        }),
      })

      if (response.ok) {
        // Aguarda um pouco para garantir que o banco atualizou
        await new Promise(resolve => setTimeout(resolve, 300))
        // Busca pagamentos novamente para atualizar o status
        await fetchPagamentos(selectedFuncionario.id)
        // Recarrega os funcionários também para garantir sincronização
        await fetchFuncionarios()
        // Força atualização do estado
        setPagamentosInfo((prev) => {
          // Força re-render recriando o objeto
          return { ...prev }
        })
        // Recarrega a página para garantir que tudo está atualizado
        router.refresh()
        handleClosePagamentoModal()
      } else {
        const error = await response.json()
        toast.error('Erro ao registrar', error.error || 'Não foi possível registrar o pagamento.')
      }
    } catch (error) {
      console.error('Erro ao registrar pagamento:', error)
      toast.error('Erro ao registrar', 'Ocorreu um erro ao tentar registrar o pagamento.')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenModal = (funcionario?: Funcionario) => {
    if (funcionario) {
      setEditingFuncionario(funcionario)
      setFormData({
        nome_original: funcionario.nome_original,
        cargo: funcionario.cargo || '',
        salario_base:
          (funcionario as any).remuneracao_valor
            ? String((funcionario as any).remuneracao_valor)
            : funcionario.salario_base
              ? String(funcionario.salario_base)
              : '',
        tipo: funcionario.tipo || '',
        remuneracao_tipo: ((funcionario as any).remuneracao_tipo as any) || 'mensal',
        ativo: funcionario.ativo,
      })
    } else {
      setEditingFuncionario(null)
      setFormData({
        nome_original: '',
        cargo: '',
        salario_base: '',
        tipo: '',
        remuneracao_tipo: 'mensal',
        ativo: true,
      })
    }
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingFuncionario(null)
    setFormData({
      nome_original: '',
      cargo: '',
      salario_base: '',
      tipo: '',
      remuneracao_tipo: 'mensal',
      ativo: true,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.nome_original.trim()) {
      toast.error('Campo obrigatório', 'O nome é obrigatório.')
      return
    }

    setLoading(true)
    try {
      const url = editingFuncionario
        ? `/api/funcionarios/${editingFuncionario.id}`
        : '/api/funcionarios'
      
      const method = editingFuncionario ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome_original: formData.nome_original.trim(),
          cargo: formData.cargo.trim() || null,
          salario_base: formData.salario_base ? parseFloat(formData.salario_base) : null,
          tipo: formData.tipo || null,
          remuneracao_tipo: formData.remuneracao_tipo || 'mensal',
          remuneracao_valor: formData.salario_base ? parseFloat(formData.salario_base) : null,
          ativo: formData.ativo,
        }),
      })

      if (response.ok) {
        router.refresh()
        fetchFuncionarios()
        handleCloseModal()
      } else {
        const error = await response.json()
        toast.error('Erro ao salvar', error.error || 'Não foi possível salvar o funcionário.')
      }
    } catch (error) {
      console.error('Erro ao salvar funcionário:', error)
      toast.error('Erro ao salvar', 'Ocorreu um erro ao tentar salvar o funcionário.')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = (id: string, nome: string) => {
    setFuncionarioToDelete({ id, nome })
    setDeleteConfirmOpen(true)
  }

  const confirmDelete = async () => {
    if (!funcionarioToDelete) return

    setLoading(true)
    setDeleteConfirmOpen(false)

    try {
      const response = await fetch(`/api/funcionarios/${funcionarioToDelete.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Funcionário excluído', `"${funcionarioToDelete.nome}" foi removido com sucesso.`)
        router.refresh()
        fetchFuncionarios()
      } else {
        const error = await response.json()
        toast.error('Erro ao excluir', error.error || 'Não foi possível excluir o funcionário.')
      }
    } catch (error) {
      console.error('Erro ao excluir funcionário:', error)
      toast.error('Erro ao excluir', 'Ocorreu um erro ao tentar excluir o funcionário.')
    } finally {
      setLoading(false)
      setFuncionarioToDelete(null)
    }
  }

  const formatCurrency = (value: number | null) => {
    if (!value) return '-'
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

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

  const getRemuneracaoLabel = (tipo: 'mensal' | 'quinzenal' | 'diaria') => {
    if (tipo === 'quinzenal') return 'Valor por quinzena (R$)'
    if (tipo === 'diaria') return 'Valor da diária (R$)'
    return 'Salário mensal (R$)'
  }

  const ativos = funcionarios.filter((f) => f.ativo)
  const inativos = funcionarios.filter((f) => !f.ativo)
  
  // Separa funcionários pagos e pendentes
  const funcionariosPagos = ativos.filter((f) => {
    const pagamento = pagamentosInfo[f.id]
    return pagamento?.mesAtualPago === true
  })
  
  const funcionariosPendentes = ativos.filter((f) => {
    const pagamento = pagamentosInfo[f.id]
    return !pagamento || pagamento.mesAtualPago === false
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Funcionários</h1>
          <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600">
            Gerencie os funcionários da sua empresa
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all duration-200 shadow-sm hover:shadow-md font-medium text-sm sm:text-base"
        >
          <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="hidden sm:inline">Adicionar Funcionário</span>
          <span className="sm:hidden">Adicionar</span>
        </button>
      </div>

      {/* Seletor de Período */}
      <PeriodoSelector />

      {/* Estatísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm sm:shadow p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-500">Total</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">
                {funcionarios.length}
              </p>
            </div>
            <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm sm:shadow p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-500">Ativos</p>
              <p className="text-2xl sm:text-3xl font-bold text-green-600 mt-1">
                {ativos.length}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm sm:shadow p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-500">Folha Total</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900 mt-1">
                {formatCurrency(
                  ativos.reduce((sum, f) => sum + (f.salario_base || 0), 0)
                )}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm sm:shadow p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-500">Pendentes</p>
              <p className="text-2xl sm:text-3xl font-bold text-orange-600 mt-1">
                {funcionariosPendentes.length}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Circle className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm sm:shadow p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-500">Pagos</p>
              <p className="text-2xl sm:text-3xl font-bold text-emerald-600 mt-1">
                {funcionariosPagos.length}
              </p>
            </div>
            <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Funcionários Pendentes (prioridade) */}
      {funcionariosPendentes.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm sm:shadow overflow-hidden border-l-4 border-orange-500">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200 bg-orange-50">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  ⚠️ Pendentes de Pagamento ({funcionariosPendentes.length})
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Funcionários que ainda não receberam pagamento em{' '}
                  {new Date(anoSelecionado, mesSelecionado - 1, 1).toLocaleDateString('pt-BR', {
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </div>
          <div className="divide-y divide-gray-200">
            {funcionariosPendentes.map((funcionario) => {
              const pagamento = pagamentosInfo[funcionario.id]
              const isExpanded = expandedFuncionario === funcionario.id

              return (
                <div key={funcionario.id} className="p-4 sm:p-6 hover:bg-orange-50/50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                          {funcionario.nome_original}
                        </h3>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-orange-100 text-orange-800">
                          ⏳ Pendente
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 text-sm text-gray-600 mb-3">
                        {funcionario.cargo && (
                          <div>
                            <span className="font-medium">Cargo:</span> {funcionario.cargo}
                          </div>
                        )}
                        {funcionario.tipo && (
                          <div>
                            <span className="font-medium">Tipo:</span> {getTipoLabel(funcionario.tipo)}
                          </div>
                        )}
                        <div>
                          <span className="font-medium">Salário Base:</span>{' '}
                          <span className="text-gray-900 font-semibold">
                            {formatCurrency(funcionario.salario_base)}
                          </span>
                        </div>
                      </div>
                      {pagamento && pagamento.ultimoPagamento && (
                        <div className="text-sm text-gray-500 mb-2">
                          <span className="font-medium">Último pagamento:</span>{' '}
                          {new Date(pagamento.ultimoPagamento.date).toLocaleDateString('pt-BR')}
                        </div>
                      )}
                      {isExpanded && pagamento && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-semibold text-gray-900">Histórico de Pagamentos</h4>
                          </div>
                          {pagamento.pagamentos.length > 0 ? (
                            <div className="space-y-2">
                              {pagamento.pagamentos.map((pag) => (
                                <div
                                  key={pag.id}
                                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                                >
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">
                                      {formatCurrency(Number(pag.amount))}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {new Date(pag.date).toLocaleDateString('pt-BR', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric',
                                      })}
                                      {pag.description && ` • ${pag.description}`}
                                    </p>
                                  </div>
                                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500">
                              Nenhum pagamento registrado em{' '}
                              {new Date(anoSelecionado, mesSelecionado - 1, 1).toLocaleDateString('pt-BR', {
                                month: 'long',
                                year: 'numeric',
                              })}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleOpenPagamentoModal(funcionario)}
                        className="px-3 py-1.5 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors shadow-sm"
                        title="Registrar Pagamento"
                      >
                        <span className="hidden sm:inline">Pagar</span>
                        <DollarSign className="w-4 h-4 sm:hidden" />
                      </button>
                      <button
                        onClick={() => handleToggleExpand(funcionario.id)}
                        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                        title={isExpanded ? 'Ocultar histórico' : 'Ver histórico'}
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5" />
                        ) : (
                          <ChevronDown className="w-5 h-5" />
                        )}
                      </button>
                      <button
                        onClick={() => handleOpenModal(funcionario)}
                        className="p-2 text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(funcionario.id, funcionario.nome_original)}
                        className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Excluir"
                        disabled={loading}
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Funcionários Pagos */}
      {funcionariosPagos.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm sm:shadow overflow-hidden border-l-4 border-emerald-500">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200 bg-emerald-50">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  ✅ Pagos ({funcionariosPagos.length})
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Funcionários que já receberam pagamento em{' '}
                  {new Date(anoSelecionado, mesSelecionado - 1, 1).toLocaleDateString('pt-BR', {
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </div>
          <div className="divide-y divide-gray-200">
            {funcionariosPagos.map((funcionario) => {
              const pagamento = pagamentosInfo[funcionario.id]
              const isExpanded = expandedFuncionario === funcionario.id

              return (
                <div key={funcionario.id} className="p-4 sm:p-6 hover:bg-emerald-50/50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                          {funcionario.nome_original}
                        </h3>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-emerald-100 text-emerald-800 gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Pago
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 text-sm text-gray-600 mb-3">
                        {funcionario.cargo && (
                          <div>
                            <span className="font-medium">Cargo:</span> {funcionario.cargo}
                          </div>
                        )}
                        {funcionario.tipo && (
                          <div>
                            <span className="font-medium">Tipo:</span> {getTipoLabel(funcionario.tipo)}
                          </div>
                        )}
                        <div>
                          <span className="font-medium">Salário Base:</span>{' '}
                          <span className="text-gray-900 font-semibold">
                            {formatCurrency(funcionario.salario_base)}
                          </span>
                        </div>
                      </div>
                      {pagamento && (
                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                          <div>
                            <span className="font-medium">Total pago em{' '}
                              {new Date(anoSelecionado, mesSelecionado - 1, 1).toLocaleDateString('pt-BR', {
                                month: 'short',
                                year: 'numeric',
                              })}:
                            </span>{' '}
                            <span className="text-emerald-600 font-semibold">
                              {formatCurrency(pagamento.totalMes)}
                            </span>
                          </div>
                          {pagamento.ultimoPagamento && (
                            <div>
                              <span className="font-medium">Último pagamento:</span>{' '}
                              {new Date(pagamento.ultimoPagamento.date).toLocaleDateString('pt-BR')}
                            </div>
                          )}
                        </div>
                      )}
                      {isExpanded && pagamento && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-semibold text-gray-900">Histórico de Pagamentos</h4>
                          </div>
                          {pagamento.pagamentos.length > 0 ? (
                            <div className="space-y-2">
                              {pagamento.pagamentos.map((pag) => (
                                <div
                                  key={pag.id}
                                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                                >
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">
                                      {formatCurrency(Number(pag.amount))}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {new Date(pag.date).toLocaleDateString('pt-BR', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric',
                                      })}
                                      {pag.description && ` • ${pag.description}`}
                                    </p>
                                  </div>
                                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500">
                              Nenhum pagamento registrado em{' '}
                              {new Date(anoSelecionado, mesSelecionado - 1, 1).toLocaleDateString('pt-BR', {
                                month: 'long',
                                year: 'numeric',
                              })}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleOpenPagamentoModal(funcionario)}
                        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Registrar Pagamento"
                      >
                        <DollarSign className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleToggleExpand(funcionario.id)}
                        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                        title={isExpanded ? 'Ocultar histórico' : 'Ver histórico'}
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5" />
                        ) : (
                          <ChevronDown className="w-5 h-5" />
                        )}
                      </button>
                      <button
                        onClick={() => handleOpenModal(funcionario)}
                        className="p-2 text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(funcionario.id, funcionario.nome_original)}
                        className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Excluir"
                        disabled={loading}
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Lista de Funcionários Ativos (se não houver pendentes/pagos separados) */}
      {ativos.length > 0 && funcionariosPendentes.length === 0 && funcionariosPagos.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm sm:shadow overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Funcionários Ativos</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {ativos.map((funcionario) => {
              const pagamento = pagamentosInfo[funcionario.id]
              const isExpanded = expandedFuncionario === funcionario.id
              const mesPago = pagamento?.mesAtualPago || false

              return (
                <div key={funcionario.id} className="p-4 sm:p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                          {funcionario.nome_original}
                        </h3>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-green-100 text-green-800">
                          Ativo
                        </span>
                        {mesPago && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-emerald-100 text-emerald-800 gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Pago este mês
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 text-sm text-gray-600 mb-3">
                        {funcionario.cargo && (
                          <div>
                            <span className="font-medium">Cargo:</span> {funcionario.cargo}
                          </div>
                        )}
                        {funcionario.tipo && (
                          <div>
                            <span className="font-medium">Tipo:</span> {getTipoLabel(funcionario.tipo)}
                          </div>
                        )}
                        <div>
                          <span className="font-medium">Salário Base:</span>{' '}
                          <span className="text-gray-900 font-semibold">
                            {formatCurrency(funcionario.salario_base)}
                          </span>
                        </div>
                      </div>
                      {pagamento && (
                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                          <div>
                            <span className="font-medium">Total pago em{' '}
                              {new Date(anoSelecionado, mesSelecionado - 1, 1).toLocaleDateString('pt-BR', {
                                month: 'short',
                                year: 'numeric',
                              })}:
                            </span>{' '}
                            <span className="text-emerald-600 font-semibold">
                              {formatCurrency(pagamento.totalMes)}
                            </span>
                          </div>
                          {pagamento.ultimoPagamento && (
                            <div>
                              <span className="font-medium">Último pagamento:</span>{' '}
                              {new Date(pagamento.ultimoPagamento.date).toLocaleDateString('pt-BR')}
                            </div>
                          )}
                        </div>
                      )}
                      {/* Histórico expandido */}
                      {isExpanded && pagamento && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-semibold text-gray-900">Histórico de Pagamentos</h4>
                          </div>
                          {pagamento.pagamentos.length > 0 ? (
                            <div className="space-y-2">
                              {pagamento.pagamentos.map((pag) => (
                                <div
                                  key={pag.id}
                                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                                >
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">
                                      {formatCurrency(Number(pag.amount))}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {new Date(pag.date).toLocaleDateString('pt-BR', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric',
                                      })}
                                      {pag.description && ` • ${pag.description}`}
                                    </p>
                                  </div>
                                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500">
                              Nenhum pagamento registrado em{' '}
                              {new Date(anoSelecionado, mesSelecionado - 1, 1).toLocaleDateString('pt-BR', {
                                month: 'long',
                                year: 'numeric',
                              })}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleOpenPagamentoModal(funcionario)}
                        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Registrar Pagamento"
                      >
                        <DollarSign className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleToggleExpand(funcionario.id)}
                        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                        title={isExpanded ? 'Ocultar histórico' : 'Ver histórico'}
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5" />
                        ) : (
                          <ChevronDown className="w-5 h-5" />
                        )}
                      </button>
                      <button
                        onClick={() => handleOpenModal(funcionario)}
                        className="p-2 text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(funcionario.id, funcionario.nome_original)}
                        className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Excluir"
                        disabled={loading}
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Lista de Funcionários Inativos */}
      {inativos.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm sm:shadow overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Funcionários Inativos</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {inativos.map((funcionario) => {
              const pagamento = pagamentosInfo[funcionario.id]
              const isExpanded = expandedFuncionario === funcionario.id
              const mesPago = pagamento?.mesAtualPago || false

              return (
                <div key={funcionario.id} className="p-4 sm:p-6 hover:bg-gray-50 transition-colors opacity-60">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                          {funcionario.nome_original}
                        </h3>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-800">
                          Inativo
                        </span>
                        {mesPago && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-emerald-100 text-emerald-800 gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Pago este mês
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 text-sm text-gray-600 mb-3">
                        {funcionario.cargo && (
                          <div>
                            <span className="font-medium">Cargo:</span> {funcionario.cargo}
                          </div>
                        )}
                        {funcionario.tipo && (
                          <div>
                            <span className="font-medium">Tipo:</span> {getTipoLabel(funcionario.tipo)}
                          </div>
                        )}
                        <div>
                          <span className="font-medium">Salário Base:</span>{' '}
                          <span className="text-gray-900 font-semibold">
                            {formatCurrency(funcionario.salario_base)}
                          </span>
                        </div>
                      </div>
                      {pagamento && (
                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                          <div>
                            <span className="font-medium">Total pago em{' '}
                              {new Date(anoSelecionado, mesSelecionado - 1, 1).toLocaleDateString('pt-BR', {
                                month: 'short',
                                year: 'numeric',
                              })}:
                            </span>{' '}
                            <span className="text-emerald-600 font-semibold">
                              {formatCurrency(pagamento.totalMes)}
                            </span>
                          </div>
                          {pagamento.ultimoPagamento && (
                            <div>
                              <span className="font-medium">Último pagamento:</span>{' '}
                              {new Date(pagamento.ultimoPagamento.date).toLocaleDateString('pt-BR')}
                            </div>
                          )}
                        </div>
                      )}
                      {/* Histórico expandido */}
                      {isExpanded && pagamento && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-semibold text-gray-900">Histórico de Pagamentos</h4>
                          </div>
                          {pagamento.pagamentos.length > 0 ? (
                            <div className="space-y-2">
                              {pagamento.pagamentos.map((pag) => (
                                <div
                                  key={pag.id}
                                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                                >
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">
                                      {formatCurrency(Number(pag.amount))}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {new Date(pag.date).toLocaleDateString('pt-BR', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric',
                                      })}
                                      {pag.description && ` • ${pag.description}`}
                                    </p>
                                  </div>
                                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500">
                              Nenhum pagamento registrado em{' '}
                              {new Date(anoSelecionado, mesSelecionado - 1, 1).toLocaleDateString('pt-BR', {
                                month: 'long',
                                year: 'numeric',
                              })}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleOpenPagamentoModal(funcionario)}
                        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Registrar Pagamento"
                      >
                        <DollarSign className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleToggleExpand(funcionario.id)}
                        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                        title={isExpanded ? 'Ocultar histórico' : 'Ver histórico'}
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5" />
                        ) : (
                          <ChevronDown className="w-5 h-5" />
                        )}
                      </button>
                      <button
                        onClick={() => handleOpenModal(funcionario)}
                        className="p-2 text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(funcionario.id, funcionario.nome_original)}
                        className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Excluir"
                        disabled={loading}
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Mensagem quando não há funcionários */}
      {funcionarios.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm sm:shadow p-8 sm:p-12 text-center">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Nenhum funcionário cadastrado
          </h3>
          <p className="text-gray-600 mb-6">
            Comece adicionando seu primeiro funcionário
          </p>
          <button
            onClick={() => handleOpenModal()}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
          >
            <Plus className="w-5 h-5" />
            Adicionar Funcionário
          </button>
        </div>
      )}

      {/* Modal de Pagamento */}
      {isPagamentoModalOpen && selectedFuncionario && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/50 transition-opacity"
              onClick={handleClosePagamentoModal}
            />
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6 sm:p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                  Registrar Pagamento
                </h2>
                <button
                  onClick={handleClosePagamentoModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-lg"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mb-4 p-3 bg-emerald-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">
                  <span className="font-medium">Funcionário:</span> {selectedFuncionario.nome_original}
                </p>
                {selectedFuncionario.salario_base && (
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Salário Base:</span>{' '}
                    <span className="text-emerald-600 font-semibold">
                      {formatCurrency(selectedFuncionario.salario_base)}
                    </span>
                  </p>
                )}
              </div>

              <form onSubmit={handleRegistrarPagamento} className="space-y-4 sm:space-y-5">
                {/* Valor */}
                <CurrencyInput
                  label="Valor"
                  required
                  value={pagamentoData.valor}
                  onChange={(value) => setPagamentoData({ ...pagamentoData, valor: String(value) })}
                  placeholder="0,00"
                />

                {/* Data */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data do Pagamento <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={pagamentoData.data}
                    onChange={(e) => setPagamentoData({ ...pagamentoData, data: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors shadow-sm"
                  />
                </div>

                {/* Observação */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Observação (opcional)
                  </label>
                  <textarea
                    value={pagamentoData.observacao}
                    onChange={(e) => setPagamentoData({ ...pagamentoData, observacao: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors shadow-sm"
                    rows={3}
                    placeholder="Ex: Pagamento mensal"
                  />
                </div>

                {/* Botões */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={handleClosePagamentoModal}
                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={loading}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-2.5 rounded-lg font-medium text-white transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-sm bg-emerald-600 hover:bg-emerald-700"
                  >
                    {loading ? 'Registrando...' : 'Registrar Pagamento'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/50 transition-opacity"
              onClick={handleCloseModal}
            />
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6 sm:p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                  {editingFuncionario ? 'Editar Funcionário' : 'Adicionar Funcionário'}
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-lg"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
                {/* Nome */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nome_original}
                    onChange={(e) => setFormData({ ...formData, nome_original: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors shadow-sm"
                    placeholder="Ex: João Silva"
                  />
                </div>

                {/* Cargo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cargo (opcional)
                  </label>
                  <input
                    type="text"
                    value={formData.cargo}
                    onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors shadow-sm"
                    placeholder="Ex: Desenvolvedor"
                  />
                </div>

                {/* Salário */}
                <CurrencyInput
                  label={getRemuneracaoLabel(formData.remuneracao_tipo)}
                  value={formData.salario_base}
                  onChange={(value) => setFormData({ ...formData, salario_base: String(value) })}
                  placeholder="0,00"
                />

                {/* Tipo de remuneração */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de remuneração <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.remuneracao_tipo}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        remuneracao_tipo: e.target.value as 'mensal' | 'quinzenal' | 'diaria',
                      })
                    }
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors shadow-sm bg-white"
                  >
                    <option value="mensal">Mensal</option>
                    <option value="quinzenal">Quinzenal</option>
                    <option value="diaria">Diária</option>
                  </select>
                </div>

                {/* Tipo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo (opcional)
                  </label>
                  <select
                    value={formData.tipo}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        tipo: e.target.value as '' | 'fixo' | 'freelancer' | 'temporario',
                      })
                    }
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors shadow-sm bg-white"
                  >
                    <option value="">Selecione...</option>
                    <option value="fixo">Fixo (CLT)</option>
                    <option value="freelancer">Freelancer</option>
                    <option value="temporario">Temporário</option>
                  </select>
                </div>

                {/* Ativo */}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="ativo"
                    checked={formData.ativo}
                    onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                    className="w-5 h-5 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                  />
                  <label htmlFor="ativo" className="text-sm font-medium text-gray-700">
                    Funcionário ativo
                  </label>
                </div>

                {/* Botões */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={loading}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-2.5 rounded-lg font-medium text-white transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-sm bg-emerald-600 hover:bg-emerald-700"
                  >
                    {loading ? 'Salvando...' : editingFuncionario ? 'Atualizar' : 'Salvar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
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
          Tem certeza que deseja excluir o funcionário?
          {funcionarioToDelete && (
            <span className="block mt-2 text-sm text-gray-500">
              "{funcionarioToDelete.nome}"
            </span>
          )}
        </p>

        <DialogActions>
          <button
            onClick={() => {
              setDeleteConfirmOpen(false)
              setFuncionarioToDelete(null)
            }}
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
