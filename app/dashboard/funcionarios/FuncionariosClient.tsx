'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Users, ArrowRight } from 'lucide-react'
import type { Funcionario } from '@/lib/db/types'
import { useToast } from '@/app/components/ui'
import { CurrencyInput } from '@/app/components/ui/CurrencyInput'
import { formatCurrency } from '@/lib/utils/format-currency'
import Link from 'next/link'

interface FuncionariosClientProps {
  funcionarios: Funcionario[]
}

export function FuncionariosClient({ funcionarios: initialFuncionarios }: FuncionariosClientProps) {
  const router = useRouter()
  const toast = useToast()
  const [funcionarios, setFuncionarios] = useState(initialFuncionarios)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    nome_original: '',
    cargo: '',
    salario_base: '',
    tipo: '' as '' | 'fixo' | 'freelancer' | 'temporario',
    ativo: true,
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

  const handleOpenModal = () => {
    setFormData({
      nome_original: '',
      cargo: '',
      salario_base: '',
      tipo: '',
      ativo: true,
    })
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setFormData({
      nome_original: '',
      cargo: '',
      salario_base: '',
      tipo: '',
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
      const response = await fetch('/api/funcionarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome_original: formData.nome_original.trim(),
          cargo: formData.cargo.trim() || null,
          salario_base: formData.salario_base ? parseFloat(formData.salario_base) : null,
          tipo: formData.tipo || null,
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

  const ativos = funcionarios.filter((f) => f.ativo)
  const inativos = funcionarios.filter((f) => !f.ativo)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Funcionários</h1>
          <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600">
            Cadastre funcionários e visualize o histórico de pagamentos
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

      {/* Estatísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm sm:shadow p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-500">Total</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">{funcionarios.length}</p>
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
              <p className="text-2xl sm:text-3xl font-bold text-green-600 mt-1">{ativos.length}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm sm:shadow p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-500">Inativos</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-600 mt-1">{inativos.length}</p>
            </div>
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-gray-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Funcionários Ativos */}
      {ativos.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm sm:shadow overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Funcionários Ativos</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {ativos.map((funcionario) => (
              <Link
                key={funcionario.id}
                href={`/dashboard/funcionarios/${funcionario.id}`}
                className="block p-4 sm:p-6 hover:bg-gray-50 transition-colors group"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900 group-hover:text-emerald-600 transition-colors">
                        {funcionario.nome_original}
                      </h3>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-green-100 text-green-800">
                        Ativo
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 text-sm text-gray-600">
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
                      {funcionario.salario_base && (
                        <div>
                          <span className="font-medium">Salário Base:</span>{' '}
                          <span className="text-gray-900 font-semibold">
                            {formatCurrency(funcionario.salario_base)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-emerald-600 transition-colors" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Funcionários Inativos */}
      {inativos.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm sm:shadow overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Funcionários Inativos</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {inativos.map((funcionario) => (
              <Link
                key={funcionario.id}
                href={`/dashboard/funcionarios/${funcionario.id}`}
                className="block p-4 sm:p-6 hover:bg-gray-50 transition-colors group opacity-60"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900 group-hover:text-emerald-600 transition-colors">
                        {funcionario.nome_original}
                      </h3>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-800">
                        Inativo
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 text-sm text-gray-600">
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
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-emerald-600 transition-colors" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Mensagem quando não há funcionários */}
      {funcionarios.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm sm:shadow p-8 sm:p-12 text-center">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum funcionário cadastrado</h3>
          <p className="text-gray-600 mb-6">Comece adicionando seu primeiro funcionário</p>
          <button
            onClick={() => handleOpenModal()}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
          >
            <Plus className="w-5 h-5" />
            Adicionar Funcionário
          </button>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={handleCloseModal} />
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6 sm:p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Adicionar Funcionário</h2>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cargo (opcional)</label>
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
                  label="Salário Base (opcional)"
                  value={formData.salario_base ? parseFloat(formData.salario_base) : 0}
                  onChange={(value) => setFormData({ ...formData, salario_base: String(value) })}
                  placeholder="0,00"
                />

                {/* Tipo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tipo (opcional)</label>
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
                    {loading ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
