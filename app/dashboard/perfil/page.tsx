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
      // Se já existe empresa_id, o usuário já é "empresa" (sem precisar escolher de novo).
      setMode(data.user.empresa_id ? 'empresa' : data.user.mode === 'empresa' ? 'empresa' : 'pessoal')
      setEmpresaId(data.user.empresa_id || '')

      // carrega empresas do tenant
      try {
        const empRes = await fetch('/api/empresas')
        const empJson = await empRes.json()
        setEmpresas(Array.isArray(empJson.empresas) ? empJson.empresas : [])
      } catch {
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
      const response = await fetch('/api/auth/link-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ whatsappNumber }),
      })

      const data = await response.json()

      if (!response.ok) {
        setMessage({ type: 'error', text: data.error || 'Erro ao vincular WhatsApp' })
        return
      }

      setMessage({ type: 'success', text: 'WhatsApp vinculado com sucesso!' })
      await loadUser()
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao vincular WhatsApp' })
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
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Informações Pessoais</h2>
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
                <label className="block text-sm font-medium text-gray-700">Empresa</label>
                <select
                  value={empresaId}
                  onChange={(e) => setEmpresaId(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                >
                  <option value="">Selecione uma empresa</option>
                  {empresas.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nome_fantasia}
                    </option>
                  ))}
                </select>
                {user.empresa_nome_fantasia && user.empresa_id && (
                  <p className="mt-2 text-xs text-gray-500">
                    Atual: {user.empresa_nome_fantasia} ({user.empresa_id})
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
      </div>
    </div>
  )
}
