'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LOGO_URL } from '@/lib/constants'

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
    mode: 'pessoal' as 'pessoal' | 'empresa',
    empresaNomeFantasia: '',
    empresaRazaoSocial: '',
    empresaCnpj: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const isEmpresa = formData.mode === 'empresa'

  function setMode(mode: 'pessoal' | 'empresa') {
    setError('')
    setFormData((prev) => ({
      ...prev,
      mode,
      // mantém dados digitados, mas evita mandar lixo se voltar pra pessoal
      empresaNomeFantasia: mode === 'empresa' ? prev.empresaNomeFantasia : '',
      empresaRazaoSocial: mode === 'empresa' ? prev.empresaRazaoSocial : '',
      empresaCnpj: mode === 'empresa' ? prev.empresaCnpj : '',
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (isEmpresa && (!formData.empresaNomeFantasia || formData.empresaNomeFantasia.trim().length === 0)) {
      setError('No modo empresarial, o nome fantasia da empresa é obrigatório')
      return
    }

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
          mode: formData.mode,
          empresaNomeFantasia: formData.mode === 'empresa' ? formData.empresaNomeFantasia : undefined,
          empresaRazaoSocial: formData.mode === 'empresa' ? formData.empresaRazaoSocial : undefined,
          empresaCnpj: formData.mode === 'empresa' ? formData.empresaCnpj : undefined,
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
    <div className="min-h-screen flex items-center lg:items-start justify-center px-4 py-10 lg:py-16 bg-gradient-to-br from-emerald-50 via-white to-emerald-100">
      <div className="w-full max-w-md lg:max-w-4xl p-6 sm:p-8 lg:p-10 bg-white/80  rounded-2xl shadow-xl ring-1 ring-gray-200">
        <div>
          <div className="flex justify-center">
            <div className="relative h-10 w-[220px] flex items-center justify-center">
              <img
                src={LOGO_URL}
                alt="ORGANIZAPAY"
                className="h-full w-auto object-contain"
              />
            </div>
            <p className="sr-only">ORGANIZAPAY</p>
          </div>
          <h2 className="mt-2 text-center text-3xl font-extrabold text-gray-900">
            Criar Conta
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            <span>Registre-se para começar a usar o</span>
            <span className="inline-flex align-middle mx-2 relative h-5 w-[120px] flex items-center justify-center">
              <img
                src={LOGO_URL}
                alt="ORGANIZAPAY"
                className="h-full w-auto object-contain"
              />
            </span>
          </p>
        </div>

        {/* Abas */}
        <div className="mt-6">
          <div className="mx-auto flex items-center justify-center">
            <div className="inline-flex rounded-full bg-gray-100 p-1 ring-1 ring-gray-200">
              <button
                type="button"
                onClick={() => setMode('pessoal')}
                className={`px-4 py-2 text-sm font-semibold rounded-full transition-colors ${
                  !isEmpresa
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Pessoal
              </button>
              <button
                type="button"
                onClick={() => setMode('empresa')}
                className={`px-4 py-2 text-sm font-semibold rounded-full transition-colors ${
                  isEmpresa
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Empresa
              </button>
            </div>
          </div>

          <p className="mt-3 text-center text-xs text-gray-500">
            {isEmpresa
              ? 'Você vai operar em um contexto de empresa, com dados separados do modo pessoal.'
              : 'Organização pessoal (comportamento atual).'}
          </p>
        </div>

        <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {/* Grid (desktop) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Dados da Empresa */}
              {isEmpresa && (
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-emerald-900">Dados da empresa</h3>
                      <p className="text-xs text-emerald-900/70">
                        Esses dados aparecem no topo do painel no modo empresa.
                      </p>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="empresaNomeFantasia" className="block text-sm font-medium text-gray-700">
                      Nome fantasia da empresa <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="empresaNomeFantasia"
                      name="empresaNomeFantasia"
                      type="text"
                      required
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                      placeholder="Ex: Oficina do João"
                      value={formData.empresaNomeFantasia}
                      onChange={(e) => setFormData({ ...formData, empresaNomeFantasia: e.target.value })}
                    />
                  </div>

                  <div>
                    <label htmlFor="empresaRazaoSocial" className="block text-sm font-medium text-gray-700">
                      Razão social (opcional)
                    </label>
                    <input
                      id="empresaRazaoSocial"
                      name="empresaRazaoSocial"
                      type="text"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                      placeholder="Ex: João Serviços LTDA"
                      value={formData.empresaRazaoSocial}
                      onChange={(e) => setFormData({ ...formData, empresaRazaoSocial: e.target.value })}
                    />
                  </div>

                  <div>
                    <label htmlFor="empresaCnpj" className="block text-sm font-medium text-gray-700">
                      CNPJ (opcional)
                    </label>
                    <input
                      id="empresaCnpj"
                      name="empresaCnpj"
                      type="text"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                      placeholder="00.000.000/0000-00"
                      value={formData.empresaCnpj}
                      onChange={(e) => setFormData({ ...formData, empresaCnpj: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {/* Dados da Conta */}
              <div
                className={`rounded-xl border border-gray-200 bg-white p-4 space-y-4 ${
                  isEmpresa ? '' : 'lg:col-span-2'
                }`}
              >
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Dados da conta</h3>
                  <p className="text-xs text-gray-500">Usados para login e identificação.</p>
                </div>

                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Nome
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
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
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
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
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
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
              </div>

              {/* Senha */}
              <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-4 lg:col-span-2">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Senha</h3>
                  <p className="text-xs text-gray-500">Mínimo de 6 caracteres.</p>
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
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
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
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                    placeholder="Digite a senha novamente"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-emerald-700 hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 shadow-sm"
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
