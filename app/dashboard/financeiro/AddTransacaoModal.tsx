'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/app/components/ui'
import { CurrencyInput } from '@/app/components/ui/CurrencyInput'
import { getTodayLocalDate } from '@/lib/utils/format-date'

interface Categoria {
  nome: string
  tipo?: 'fixo' | 'variavel'
  is_default?: boolean
}

interface AddTransacaoModalProps {
  isOpen: boolean
  onClose: () => void
  tipo: 'expense' | 'revenue'
}

export function AddTransacaoModal({ isOpen, onClose, tipo }: AddTransacaoModalProps) {
  const router = useRouter()
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [loadingCategorias, setLoadingCategorias] = useState(true)
  const [funcionarios, setFuncionarios] = useState<Array<{ id: string; nome_original: string }>>([])
  const [loadingFuncionarios, setLoadingFuncionarios] = useState(false)
  const [fornecedores, setFornecedores] = useState<Array<{ id: string; nome: string }>>([])
  const [loadingFornecedores, setLoadingFornecedores] = useState(false)
  const [formData, setFormData] = useState({
    amount: 0,
    description: '',
    category: '',
    date: getTodayLocalDate(),
    subcategory: '',
    pago: true, // Por padrão, considera como pago/recebido
    funcionario_id: '' as string | '',
    fornecedor_id: '' as string | '',
  })

  // Atualiza pago baseado no tipo quando o modal abre
  useEffect(() => {
    if (isOpen) {
      setFormData((prev) => ({
        ...prev,
        pago: tipo === 'expense' ? true : false, // Despesas padrão pago, receitas padrão não recebido
      }))
    }
  }, [isOpen, tipo])

  // Busca categorias, funcionários e fornecedores ao abrir o modal
  useEffect(() => {
    if (isOpen) {
      fetchCategorias()
      fetchFuncionarios()
      fetchFornecedores()
    }
  }, [isOpen])

  // Busca funcionários quando categoria muda para "funcionarios" ou "funcionário"
  useEffect(() => {
    if (isFuncionariosCategory(formData.category)) {
      if (funcionarios.length === 0) {
        fetchFuncionarios()
      }
    } else {
      // Limpa funcionário selecionado se mudou de categoria
      setFormData((prev) => ({ ...prev, funcionario_id: '' }))
    }
  }, [formData.category]) // eslint-disable-line react-hooks/exhaustive-deps

  // Busca fornecedores quando categoria muda para "fornecedores" ou "fornecedor"
  useEffect(() => {
    if (isFornecedoresCategory(formData.category)) {
      if (fornecedores.length === 0) {
        fetchFornecedores()
      }
    } else {
      // Limpa fornecedor selecionado se mudou de categoria
      setFormData((prev) => ({ ...prev, fornecedor_id: '' }))
    }
  }, [formData.category]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchFuncionarios = async () => {
    try {
      setLoadingFuncionarios(true)
      const response = await fetch('/api/funcionarios')
      if (response.ok) {
        const data = await response.json()
        setFuncionarios((data.funcionarios || []).map((f: any) => ({
          id: f.id,
          nome_original: f.nome_original,
        })))
      }
    } catch (error) {
      console.error('Erro ao buscar funcionários:', error)
    } finally {
      setLoadingFuncionarios(false)
    }
  }

  const fetchFornecedores = async () => {
    try {
      setLoadingFornecedores(true)
      const response = await fetch('/api/fornecedores')
      if (response.ok) {
        const data = await response.json()
        setFornecedores((data.fornecedores || []).map((f: any) => ({
          id: f.id,
          nome: f.nome,
        })))
      }
    } catch (error) {
      console.error('Erro ao buscar fornecedores:', error)
    } finally {
      setLoadingFornecedores(false)
    }
  }

  // Função helper para verificar se a categoria é de funcionários
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

  // Função helper para verificar se a categoria é de fornecedores
  const isFornecedoresCategory = (category: string): boolean => {
    if (!category) return false
    const normalized = category.toLowerCase().trim()
    return (
      normalized === 'fornecedores' ||
      normalized === 'fornecedor'
    )
  }

  const fetchCategorias = async () => {
    try {
      setLoadingCategorias(true)
      const response = await fetch('/api/financeiro/categorias')
      if (response.ok) {
        const data = await response.json()
        // Remove categorias duplicadas baseado no nome
        const categoriasUnicas = (data.categorias || []).filter(
          (cat: Categoria, index: number, self: Categoria[]) =>
            index === self.findIndex((c) => c.nome === cat.nome)
        )
        setCategorias(categoriasUnicas)
        // Seleciona primeira categoria por padrão
        if (categoriasUnicas.length > 0) {
          setFormData((prev) => ({ ...prev, category: categoriasUnicas[0].nome }))
        }
      }
    } catch (error) {
      console.error('Erro ao buscar categorias:', error)
    } finally {
      setLoadingCategorias(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.amount || formData.amount <= 0 || !formData.description || !formData.category || !formData.date) {
      toast.error('Campos obrigatórios', 'Preencha todos os campos obrigatórios.')
      return
    }

    // Valida funcionário se categoria for funcionarios
    if (isFuncionariosCategory(formData.category) && !formData.funcionario_id) {
      toast.error('Funcionário obrigatório', 'Selecione um funcionário para esta categoria.')
      return
    }

    // Valida fornecedor se categoria for fornecedores
    if (isFornecedoresCategory(formData.category) && !formData.fornecedor_id) {
      toast.error('Fornecedor obrigatório', 'Selecione um fornecedor para esta categoria.')
      return
    }

    setLoading(true)
    try {
      // Prepara metadata com fornecedor se necessário
      let metadata: Record<string, any> | null = null
      if (isFornecedoresCategory(formData.category) && formData.fornecedor_id) {
        const fornecedorSelecionado = fornecedores.find(f => f.id === formData.fornecedor_id)
        if (fornecedorSelecionado) {
          metadata = {
            fornecedor: {
              id: fornecedorSelecionado.id,
              nome: fornecedorSelecionado.nome,
            }
          }
        }
      }

      const response = await fetch('/api/financeiro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: formData.amount,
          description: formData.description,
          category: formData.category,
          date: formData.date,
          subcategory: formData.subcategory || null,
          transactionType: tipo,
          pago: formData.pago, // Usa o valor do checkbox para ambos os tipos
          funcionario_id: isFuncionariosCategory(formData.category) && formData.funcionario_id ? formData.funcionario_id : null,
          metadata: metadata,
        }),
      })

      if (response.ok) {
        toast.success('Transação criada', 'A transação foi registrada com sucesso.')
        router.refresh()
        onClose()
        // Reset form
        setFormData({
          amount: 0,
          description: '',
          category: categorias[0]?.nome || '',
          date: getTodayLocalDate(),
          subcategory: '',
          pago: tipo === 'expense' ? true : false, // Despesas padrão pago, receitas padrão não recebido
          funcionario_id: '',
          fornecedor_id: '',
        })
      } else {
        const error = await response.json()
        toast.error('Erro ao criar', error.error || 'Não foi possível criar o registro.')
      }
    } catch (error) {
      console.error('Erro ao criar registro:', error)
      toast.error('Erro ao criar', 'Ocorreu um erro ao tentar criar o registro.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Overlay */}
        <div
          className="fixed inset-0 bg-black/50 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6 sm:p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
              Adicionar {tipo === 'expense' ? 'Despesa' : 'Receita'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-lg"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            {/* Valor */}
            <CurrencyInput
              label="Valor"
              required
              value={formData.amount}
              onChange={(value) => setFormData({ ...formData, amount: value })}
              placeholder="0,00"
            />

            {/* Descrição */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descrição <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors shadow-sm"
                placeholder="Ex: Compra no supermercado"
              />
            </div>

            {/* Categoria */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Categoria <span className="text-red-500">*</span>
              </label>
              {loadingCategorias ? (
                <div className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 shadow-sm">
                  Carregando categorias...
                </div>
              ) : (
                <select
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors shadow-sm bg-white"
                >
                  {categorias.map((cat, index) => (
                    <option key={`${cat.nome}-${index}`} value={cat.nome}>
                      {cat.nome}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Funcionário (apenas quando categoria for funcionarios) */}
            {isFuncionariosCategory(formData.category) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Funcionário <span className="text-red-500">*</span>
                </label>
                {loadingFuncionarios ? (
                  <div className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 shadow-sm">
                    Carregando funcionários...
                  </div>
                ) : funcionarios.length === 0 ? (
                  <div className="w-full px-4 py-2.5 border border-orange-300 rounded-lg bg-orange-50 text-orange-700 text-sm shadow-sm">
                    Nenhum funcionário cadastrado. Cadastre um funcionário primeiro.
                  </div>
                ) : (
                  <select
                    required
                    value={formData.funcionario_id}
                    onChange={(e) => setFormData({ ...formData, funcionario_id: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors shadow-sm bg-white"
                  >
                    <option value="">Selecione um funcionário</option>
                    {funcionarios.map((func) => (
                      <option key={func.id} value={func.id}>
                        {func.nome_original}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* Fornecedor (apenas quando categoria for fornecedores) */}
            {isFornecedoresCategory(formData.category) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fornecedor <span className="text-red-500">*</span>
                </label>
                {loadingFornecedores ? (
                  <div className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 shadow-sm">
                    Carregando fornecedores...
                  </div>
                ) : fornecedores.length === 0 ? (
                  <div className="w-full px-4 py-2.5 border border-orange-300 rounded-lg bg-orange-50 text-orange-700 text-sm shadow-sm">
                    Nenhum fornecedor cadastrado. Cadastre um fornecedor primeiro.
                  </div>
                ) : (
                  <select
                    required
                    value={formData.fornecedor_id}
                    onChange={(e) => setFormData({ ...formData, fornecedor_id: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors shadow-sm bg-white"
                  >
                    <option value="">Selecione um fornecedor</option>
                    {fornecedores.map((forn) => (
                      <option key={forn.id} value={forn.id}>
                        {forn.nome}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* Data */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors shadow-sm"
              />
            </div>

            {/* Status de Pagamento/Recebimento */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="pago"
                checked={formData.pago}
                onChange={(e) => setFormData({ ...formData, pago: e.target.checked })}
                className="w-5 h-5 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500 focus:ring-2 cursor-pointer"
              />
              <label htmlFor="pago" className="text-sm font-medium text-gray-700 cursor-pointer">
                {tipo === 'expense' ? 'Marcar como pago' : 'Marcar como recebido'}
              </label>
              {!formData.pago && (
                <span className="text-xs text-orange-600 font-medium">
                  ({tipo === 'expense' ? 'Pendente de pagamento' : 'Pendente de recebimento'})
                </span>
              )}
            </div>

            {/* Botões */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors shadow-sm"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className={`flex-1 px-4 py-2.5 rounded-lg font-medium text-white transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-sm ${
                  tipo === 'expense'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {loading ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
