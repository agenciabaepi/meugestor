'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

function formatWhatsAppMask(input: string): string {
  const digits = input.replace(/\D/g, '').slice(0, 13) // 55 + DDD + 9 dígitos
  if (!digits) return ''

  // Formato esperado (Brasil): +CC (DD) NNNNN-NNNN
  const cc = digits.slice(0, 2)
  const ddd = digits.slice(2, 4)
  const rest = digits.slice(4)

  let out = `+${cc}`
  if (ddd.length) out += ` (${ddd}`
  if (ddd.length === 2) out += `)`
  if (rest.length) {
    out += ' '
    if (rest.length <= 4) {
      out += rest
    } else if (rest.length <= 8) {
      out += `${rest.slice(0, 4)}-${rest.slice(4)}`
    } else {
      out += `${rest.slice(0, 5)}-${rest.slice(5)}`
    }
  }

  return out
}

export default function RegisterPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    whatsappNumber: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError('As senhas não coincidem')
      return
    }

    if (formData.password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres')
      return
    }

    if (!formData.whatsappNumber || formData.whatsappNumber.trim().length === 0) {
      setError('O número do WhatsApp é obrigatório')
      return
    }

    // Valida formato básico do WhatsApp (deve ter pelo menos 10 dígitos)
    const whatsappDigits = formData.whatsappNumber.replace(/\D/g, '')
    if (whatsappDigits.length < 10) {
      setError('O número do WhatsApp deve ter pelo menos 10 dígitos')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          name: formData.name,
          whatsappNumber: formData.whatsappNumber,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Erro ao criar conta')
        return
      }

      // Redireciona para o dashboard
      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      setError('Erro ao criar conta. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-emerald-50 via-white to-emerald-100">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-md">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Criar Conta
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Registre-se para começar a usar o Meu Gestor
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
              {error}
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Nome
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                placeholder="Seu nome"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                placeholder="seu@email.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="whatsappNumber" className="block text-sm font-medium text-gray-700">
                WhatsApp <span className="text-red-500">*</span>
              </label>
              <input
                id="whatsappNumber"
                name="whatsappNumber"
                type="tel"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                placeholder="+55 (11) 99999-9999"
                value={formData.whatsappNumber}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    whatsappNumber: formatWhatsAppMask(e.target.value),
                  })
                }
              />
              <p className="mt-1 text-sm text-gray-500">
                Use o formato internacional (ex: +55 (11) 99999-9999)
              </p>
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Senha
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                placeholder="Mínimo 6 caracteres"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirmar Senha
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                placeholder="Digite a senha novamente"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-emerald-700 hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50"
            >
              {loading ? 'Criando conta...' : 'Criar Conta'}
            </button>
          </div>

          <div className="text-center">
            <a
              href="/login"
              className="text-sm text-emerald-700 hover:text-emerald-600"
            >
              Já tem conta? Faça login
            </a>
          </div>
        </form>
      </div>
    </div>
  )
}
