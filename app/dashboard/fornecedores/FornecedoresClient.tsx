'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { Plus, Edit2, Trash2, Building2, Phone, Mail, MapPin, FileText, Hash } from 'lucide-react'
import type { Fornecedor } from '@/lib/db/types'
import { Dialog, DialogActions, useToast } from '@/app/components/ui'

interface FornecedoresClientProps {
  fornecedores: Fornecedor[]
}

export function FornecedoresClient({ fornecedores: initialFornecedores }: FornecedoresClientProps) {
  const router = useRouter()
  const toast = useToast()
  const [fornecedores, setFornecedores] = useState(initialFornecedores)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])
  const [editingFornecedor, setEditingFornecedor] = useState<Fornecedor | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [fornecedorToDelete, setFornecedorToDelete] = useState<{ id: string; nome: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    email: '',
    endereco: '',
    cnpj: '',
    observacao: '',
  })

  const fetchFornecedores = async () => {
    try {
      const response = await fetch('/api/fornecedores')
      if (response.ok) {
        const data = await response.json()
        setFornecedores(data.fornecedores || [])
      }
    } catch (error) {
      console.error('Erro ao buscar fornecedores:', error)
    }
  }

  const handleOpenModal = (fornecedor?: Fornecedor) => {
    if (fornecedor) {
      setEditingFornecedor(fornecedor)
      setFormData({
        nome: fornecedor.nome,
        telefone: fornecedor.telefone || '',
        email: fornecedor.email || '',
        endereco: fornecedor.endereco || '',
        cnpj: fornecedor.cnpj || '',
        observacao: fornecedor.observacao || '',
      })
    } else {
      setEditingFornecedor(null)
      setFormData({
        nome: '',
        telefone: '',
        email: '',
        endereco: '',
        cnpj: '',
        observacao: '',
      })
    }
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingFornecedor(null)
    setFormData({
      nome: '',
      telefone: '',
      email: '',
      endereco: '',
      cnpj: '',
      observacao: '',
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.nome.trim()) {
      toast.error('Campo obrigatório', 'O nome é obrigatório.')
      return
    }

    setLoading(true)
    try {
      const url = editingFornecedor
        ? `/api/fornecedores/${editingFornecedor.id}`
        : '/api/fornecedores'
      
      const method = editingFornecedor ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: formData.nome.trim(),
          telefone: formData.telefone.trim() || null,
          email: formData.email.trim() || null,
          endereco: formData.endereco.trim() || null,
          cnpj: formData.cnpj.trim() || null,
          observacao: formData.observacao.trim() || null,
        }),
      })

      if (response.ok) {
        toast.success(
          editingFornecedor ? 'Fornecedor atualizado' : 'Fornecedor cadastrado',
          editingFornecedor ? 'As alterações foram salvas com sucesso.' : 'O fornecedor foi cadastrado com sucesso.'
        )
        router.refresh()
        fetchFornecedores()
        handleCloseModal()
      } else {
        const error = await response.json()
        toast.error('Erro ao salvar', error.error || 'Não foi possível salvar o fornecedor.')
      }
    } catch (error) {
      console.error('Erro ao salvar fornecedor:', error)
      toast.error('Erro ao salvar', 'Ocorreu um erro ao tentar salvar o fornecedor.')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = (id: string, nome: string) => {
    setFornecedorToDelete({ id, nome })
    setDeleteConfirmOpen(true)
  }

  const confirmDelete = async () => {
    if (!fornecedorToDelete) return

    setLoading(true)
    setDeleteConfirmOpen(false)

    try {
      const response = await fetch(`/api/fornecedores/${fornecedorToDelete.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Fornecedor excluído', `"${fornecedorToDelete.nome}" foi removido com sucesso.`)
        router.refresh()
        fetchFornecedores()
      } else {
        const error = await response.json()
        toast.error('Erro ao excluir', error.error || 'Não foi possível excluir o fornecedor.')
      }
    } catch (error) {
      console.error('Erro ao excluir fornecedor:', error)
      toast.error('Erro ao excluir', 'Ocorreu um erro ao tentar excluir o fornecedor.')
    } finally {
      setLoading(false)
      setFornecedorToDelete(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Fornecedores</h1>
          <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600 dark:text-gray-400">
            Gerencie os fornecedores da sua empresa
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all duration-200 shadow-sm hover:shadow-md font-medium text-sm sm:text-base"
        >
          <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="hidden sm:inline">Adicionar Fornecedor</span>
          <span className="sm:hidden">Adicionar</span>
        </button>
      </div>

      {/* Lista de Fornecedores */}
      {fornecedores.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm sm:shadow p-8 sm:p-12 text-center">
          <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Nenhum fornecedor cadastrado
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Comece adicionando seu primeiro fornecedor
          </p>
          <button
            onClick={() => handleOpenModal()}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
          >
            <Plus className="w-5 h-5" />
            Adicionar Fornecedor
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm sm:shadow overflow-hidden">
          <div className="divide-y divide-gray-200">
            {fornecedores.map((fornecedor) => (
              <div key={fornecedor.id} className="p-4 sm:p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center shrink-0">
                        <Building2 className="w-5 h-5 text-emerald-600" />
                      </div>
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                        {fornecedor.nome}
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-600 dark:text-gray-400 ml-14">
                      {fornecedor.cnpj && (
                        <div className="flex items-center gap-2">
                          <Hash className="w-4 h-4 text-gray-400 shrink-0" />
                          <span>CNPJ: {fornecedor.cnpj}</span>
                        </div>
                      )}
                      {fornecedor.telefone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                          <span>{fornecedor.telefone}</span>
                        </div>
                      )}
                      {fornecedor.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                          <span className="truncate">{fornecedor.email}</span>
                        </div>
                      )}
                      {fornecedor.endereco && (
                        <div className="flex items-start gap-2 sm:col-span-2">
                          <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                          <span className="break-words">{fornecedor.endereco}</span>
                        </div>
                      )}
                      {fornecedor.observacao && (
                        <div className="flex items-start gap-2 sm:col-span-2">
                          <FileText className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                          <span className="break-words">{fornecedor.observacao}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleOpenModal(fornecedor)}
                      className="p-2 text-gray-600 dark:text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(fornecedor.id, fornecedor.nome)}
                      className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Excluir"
                      disabled={loading}
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

      {/* Modal de Adicionar/Editar Fornecedor */}
      {isModalOpen && mounted && createPortal(
        <div className="fixed inset-0 z-[9999] overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            {/* Overlay */}
            <div
              className="fixed inset-0 bg-black/50 transition-opacity"
              onClick={handleCloseModal}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col z-[10000]" onClick={(e) => e.stopPropagation()}>
              {/* Header fixo */}
              <div className="flex items-center justify-between p-6 sm:p-8 pb-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                  {editingFornecedor ? 'Editar Fornecedor' : 'Adicionar Fornecedor'}
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-gray-600 dark:text-gray-400 transition-colors p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Conteúdo rolável */}
              <div className="overflow-y-auto px-6 sm:px-8 py-6">
                <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5" id="fornecedor-form">
                {/* Nome */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Nome <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors shadow-sm"
                    placeholder="Ex: Empresa XYZ Ltda"
                  />
                </div>

                {/* CNPJ e Telefone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      CNPJ (opcional)
                    </label>
                    <input
                      type="text"
                      value={formData.cnpj}
                      onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors shadow-sm"
                      placeholder="00.000.000/0000-00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Telefone (opcional)
                    </label>
                    <input
                      type="tel"
                      value={formData.telefone}
                      onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors shadow-sm"
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email (opcional)
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors shadow-sm"
                    placeholder="contato@empresa.com"
                  />
                </div>

                {/* Endereço */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Endereço (opcional)
                  </label>
                  <input
                    type="text"
                    value={formData.endereco}
                    onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors shadow-sm"
                    placeholder="Rua, número, bairro, cidade - UF, CEP"
                  />
                </div>

                {/* Observação */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Observação (opcional)
                  </label>
                  <textarea
                    value={formData.observacao}
                    onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors shadow-sm resize-none"
                    rows={3}
                    placeholder="Observações adicionais sobre o fornecedor"
                  />
                </div>

                </form>
              </div>

              {/* Footer fixo com botões */}
              <div className="flex gap-3 p-6 sm:p-8 pt-4 border-t border-gray-200 dark:border-gray-700 shrink-0">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  form="fornecedor-form"
                  disabled={loading}
                  className="flex-1 px-4 py-2.5 rounded-lg font-medium text-white transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-sm bg-emerald-600 hover:bg-emerald-700"
                >
                  {loading ? 'Salvando...' : editingFornecedor ? 'Atualizar' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Dialog de Confirmação de Exclusão */}
      <Dialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Confirmar exclusão"
        description="Esta ação não pode ser desfeita."
        size="sm"
      >
        <p className="text-gray-700 dark:text-gray-300 mb-4">
          Tem certeza que deseja excluir o fornecedor?
          {fornecedorToDelete && (
            <span className="block mt-2 text-sm text-gray-500">
              "{fornecedorToDelete.nome}"
            </span>
          )}
        </p>

        <DialogActions>
          <button
            onClick={() => {
              setDeleteConfirmOpen(false)
              setFornecedorToDelete(null)
            }}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
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
