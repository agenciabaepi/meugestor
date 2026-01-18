'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  email: string
  name: string | null
  whatsapp_number: string
  role: string
  mode?: 'pessoal' | 'empresa'
  empresa_id?: string | null
  empresa_nome_fantasia?: string | null
  tenant: {
    id: string
    name: string
  } | null
}

interface Empresa {
  id: string
  nome_fantasia: string
  razao_social?: string | null
  cnpj?: string | null
}

export default function PerfilPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [mode, setMode] = useState<'pessoal' | 'empresa'>('pessoal')
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [empresaId, setEmpresaId] = useState<string>('')
  const [savingContext, setSavingContext] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [userName, setUserName] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [selectedEmpresa, setSelectedEmpresa] = useState<Empresa | null>(null)
  const [editingEmpresa, setEditingEmpresa] = useState(false)
  const [empresaForm, setEmpresaForm] = useState({ nome_fantasia: '', razao_social: '', cnpj: '' })
  const [savingEmpresa, setSavingEmpresa] = useState(false)

  useEffect(() => {
    loadUser()
  }, [])

  const loadUser = async () => {
    try {
      const response = await fetch('/api/auth/me')
      if (!response.ok) {
        router.push('/login')
        return
      }
      const data = await response.json()
      setUser(data.user)
      setWhatsappNumber(data.user.whatsapp_number)
      setUserName(data.user.name || '')
      // Se já existe empresa_id, o usuário já é "empresa" (sem precisar escolher de novo).
      setMode(data.user.empresa_id ? 'empresa' : data.user.mode === 'empresa' ? 'empresa' : 'pessoal')
      setEmpresaId(data.user.empresa_id || '')

      // carrega empresas do tenant
      try {
        const empRes = await fetch('/api/empresas')
        if (!empRes.ok) {
          console.error('[Perfil] Erro ao carregar empresas:', empRes.status, empRes.statusText)
          setEmpresas([])
        } else {
          const empJson = await empRes.json()
          const empresasList = Array.isArray(empJson.empresas) ? empJson.empresas : []
          console.log('[Perfil] Empresas carregadas:', empresasList.length)
          setEmpresas(empresasList)
          
          // Se há empresa_id, preenche o formulário de edição
          if (data.user.empresa_id) {
            const empresa = empresasList.find((e: Empresa) => e.id === data.user.empresa_id)
            if (empresa) {
              setSelectedEmpresa(empresa)
              setEmpresaForm({
                nome_fantasia: empresa.nome_fantasia || '',
                razao_social: empresa.razao_social || '',
                cnpj: empresa.cnpj || '',
              })
            }
          }
        }
      } catch (error) {
        console.error('[Perfil] Erro ao carregar empresas:', error)
        setEmpresas([])
      }
    } catch (error) {
      console.error('Erro ao carregar usuário:', error)
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    try {
      // Validação básica
      const normalized = whatsappNumber.replace(/\D/g, '')
      if (normalized.length < 10) {
        setMessage({ type: 'error', text: 'O número do WhatsApp deve ter pelo menos 10 dígitos' })
        setSaving(false)
        return
      }

      const response = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ whatsappNumber }),
      })

      const data = await response.json()

      if (!response.ok) {
        setMessage({ type: 'error', text: data.error || 'Erro ao atualizar WhatsApp' })
        return
      }

      setMessage({ type: 'success', text: 'WhatsApp atualizado com sucesso!' })
      await loadUser()
    } catch (error) {
      console.error('Erro ao atualizar WhatsApp:', error)
      setMessage({ type: 'error', text: 'Erro ao atualizar WhatsApp' })
    } finally {
      setSaving(false)
    }
  }

  const handleSaveContext = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingContext(true)
    setMessage(null)
    try {
      const res = await fetch('/api/auth/context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          empresaId: mode === 'empresa' ? empresaId : null,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Erro ao salvar modo' })
        return
      }
      setMessage({ type: 'success', text: 'Modo atualizado com sucesso!' })
      await loadUser()
    } catch {
      setMessage({ type: 'error', text: 'Erro ao salvar modo' })
    } finally {
      setSavingContext(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-600">Carregando...</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Meu Perfil</h1>

      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        {/* Informações do Usuário */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Informações Pessoais</h2>
            {!editingName && (
              <button
                type="button"
                onClick={() => setEditingName(true)}
                className="text-sm text-emerald-700 hover:text-emerald-800 font-medium"
              >
                Editar
              </button>
            )}
          </div>
          
          {editingName ? (
            <form
              onSubmit={async (e) => {
                e.preventDefault()
                setSavingName(true)
                setMessage(null)
                try {
                  const res = await fetch('/api/auth/me', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: userName }),
                  })
                  const data = await res.json()
                  if (!res.ok) {
                    setMessage({ type: 'error', text: data.error || 'Erro ao atualizar nome' })
                  } else {
                    setMessage({ type: 'success', text: 'Nome atualizado com sucesso!' })
                    setEditingName(false)
                    await loadUser()
                  }
                } catch {
                  setMessage({ type: 'error', text: 'Erro ao atualizar nome' })
                } finally {
                  setSavingName(false)
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700">Nome</label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                  required
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={savingName}
                  className="px-4 py-2 text-sm font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-md disabled:opacity-50"
                >
                  {savingName ? 'Salvando...' : 'Salvar'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingName(false)
                    setUserName(user.name || '')
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancelar
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Nome</label>
                <div className="mt-1 text-sm text-gray-900">{user.name || 'Não informado'}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <div className="mt-1 text-sm text-gray-900">{user.email}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Função</label>
                <div className="mt-1 text-sm text-gray-900 capitalize">{user.role}</div>
              </div>
              {user.tenant && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Organização</label>
                  <div className="mt-1 text-sm text-gray-900">{user.tenant.name}</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Vinculação WhatsApp */}
        <div className="border-t pt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">WhatsApp</h2>
          
          {message && (
            <div
              className={`mb-4 p-3 rounded ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-800 border border-green-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {message.text}
            </div>
          )}

          <form onSubmit={handleSaveWhatsApp} className="space-y-4">
            <div>
              <label htmlFor="whatsapp" className="block text-sm font-medium text-gray-700">
                Número do WhatsApp
              </label>
              <input
                id="whatsapp"
                type="tel"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                placeholder="5511999999999"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
              />
              <p className="mt-2 text-sm text-gray-500">
                Vincule seu número do WhatsApp para receber mensagens do bot. Use o formato internacional (ex: 5511999999999)
              </p>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-700 hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50"
            >
              {saving ? 'Salvando...' : 'Vincular WhatsApp'}
            </button>
          </form>

          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
            <p className="text-sm text-green-800">
              ✅ WhatsApp vinculado: {user.whatsapp_number}
            </p>
            <p className="text-xs text-green-700 mt-1">
              Você pode atualizar seu número do WhatsApp acima
            </p>
          </div>
        </div>

        {/* Modo (Pessoal/Empresa) */}
        <div className="border-t pt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Modo de operação</h2>
          <p className="text-sm text-gray-600 mb-4">
            O WhatsApp usa este modo para decidir se pode cadastrar fornecedores e lançar gastos empresariais.
          </p>

          <form onSubmit={handleSaveContext} className="space-y-4">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMode('pessoal')}
                className={`px-4 py-2 rounded-full text-sm font-medium border ${
                  mode === 'pessoal'
                    ? 'bg-emerald-700 text-white border-emerald-700'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                Pessoal
              </button>
              <button
                type="button"
                onClick={() => setMode('empresa')}
                className={`px-4 py-2 rounded-full text-sm font-medium border ${
                  mode === 'empresa'
                    ? 'bg-emerald-700 text-white border-emerald-700'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                Empresa
              </button>
            </div>

            {mode === 'empresa' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Empresa</label>
                {empresas.length === 0 ? (
                  <div className="mt-1 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-sm text-yellow-800">
                      Nenhuma empresa cadastrada. Cadastre uma empresa primeiro no registro.
                    </p>
                  </div>
                ) : (
                  <select
                    value={empresaId}
                    onChange={(e) => {
                      const id = e.target.value
                      setEmpresaId(id)
                      const empresa = empresas.find((e) => e.id === id)
                      if (empresa) {
                        setSelectedEmpresa(empresa)
                        setEmpresaForm({
                          nome_fantasia: empresa.nome_fantasia || '',
                          razao_social: empresa.razao_social || '',
                          cnpj: empresa.cnpj || '',
                        })
                      } else {
                        setSelectedEmpresa(null)
                        setEmpresaForm({ nome_fantasia: '', razao_social: '', cnpj: '' })
                      }
                    }}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                  >
                    <option value="">Selecione uma empresa</option>
                    {empresas.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.nome_fantasia}
                      </option>
                    ))}
                  </select>
                )}
                {user.empresa_nome_fantasia && user.empresa_id && (
                  <p className="mt-2 text-xs text-gray-500">
                    Atual: {user.empresa_nome_fantasia}
                  </p>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={savingContext || (mode === 'empresa' && !empresaId)}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-700 hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50"
            >
              {savingContext ? 'Salvando...' : 'Salvar modo'}
            </button>
          </form>
        </div>

        {/* Dados da Empresa (só aparece se estiver no modo empresa e tiver empresa selecionada) */}
        {mode === 'empresa' && selectedEmpresa && (
          <div className="border-t pt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Dados da Empresa</h2>
              {!editingEmpresa && (
                <button
                  type="button"
                  onClick={() => setEditingEmpresa(true)}
                  className="text-sm text-emerald-700 hover:text-emerald-800 font-medium"
                >
                  Editar
                </button>
              )}
            </div>

            {editingEmpresa ? (
              <form
                onSubmit={async (e) => {
                  e.preventDefault()
                  setSavingEmpresa(true)
                  setMessage(null)
                  try {
                    const res = await fetch(`/api/empresas/${selectedEmpresa.id}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(empresaForm),
                    })
                    const data = await res.json()
                    if (!res.ok) {
                      setMessage({ type: 'error', text: data.error || 'Erro ao atualizar empresa' })
                    } else {
                      setMessage({ type: 'success', text: 'Empresa atualizada com sucesso!' })
                      setEditingEmpresa(false)
                      await loadUser()
                    }
                  } catch {
                    setMessage({ type: 'error', text: 'Erro ao atualizar empresa' })
                  } finally {
                    setSavingEmpresa(false)
                  }
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nome Fantasia *</label>
                  <input
                    type="text"
                    value={empresaForm.nome_fantasia}
                    onChange={(e) => setEmpresaForm({ ...empresaForm, nome_fantasia: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Razão Social</label>
                  <input
                    type="text"
                    value={empresaForm.razao_social}
                    onChange={(e) => setEmpresaForm({ ...empresaForm, razao_social: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">CNPJ</label>
                  <input
                    type="text"
                    value={empresaForm.cnpj}
                    onChange={(e) => setEmpresaForm({ ...empresaForm, cnpj: e.target.value })}
                    placeholder="00.000.000/0000-00"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={savingEmpresa}
                    className="px-4 py-2 text-sm font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-md disabled:opacity-50"
                  >
                    {savingEmpresa ? 'Salvando...' : 'Salvar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingEmpresa(false)
                      if (selectedEmpresa) {
                        setEmpresaForm({
                          nome_fantasia: selectedEmpresa.nome_fantasia || '',
                          razao_social: selectedEmpresa.razao_social || '',
                          cnpj: selectedEmpresa.cnpj || '',
                        })
                      }
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nome Fantasia</label>
                  <div className="mt-1 text-sm text-gray-900">{selectedEmpresa.nome_fantasia}</div>
                </div>
                {selectedEmpresa.razao_social && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Razão Social</label>
                    <div className="mt-1 text-sm text-gray-900">{selectedEmpresa.razao_social}</div>
                  </div>
                )}
                {selectedEmpresa.cnpj && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">CNPJ</label>
                    <div className="mt-1 text-sm text-gray-900">{selectedEmpresa.cnpj}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
