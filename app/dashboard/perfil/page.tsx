'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  email: string
  name: string | null
  whatsapp_number: string
  role: string
  tenant: {
    id: string
    name: string
  } | null
}

export default function PerfilPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

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
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
              <p className="mt-2 text-sm text-gray-500">
                Vincule seu número do WhatsApp para receber mensagens do bot. Use o formato internacional (ex: 5511999999999)
              </p>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
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
      </div>
    </div>
  )
}
