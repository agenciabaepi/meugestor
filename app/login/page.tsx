'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Validação básica
      if (!email || !password) {
        setError('Por favor, preencha todos os campos')
        setLoading(false)
        return
      }

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: email.trim().toLowerCase(), 
          password 
        }),
      })

      let data
      try {
        data = await response.json()
      } catch (parseError) {
        console.error('Erro ao parsear resposta:', parseError)
        setError('Erro ao processar resposta do servidor. Tente novamente.')
        setLoading(false)
        return
      }

      if (!response.ok) {
        // Mensagens de erro mais específicas
        let errorMessage = data?.error || 'Erro ao fazer login'
        
        if (response.status === 401) {
          // Mensagem genérica para erros de autenticação
          if (errorMessage.includes('incorretos') || errorMessage.includes('Invalid login')) {
            errorMessage = 'Email ou senha incorretos. Verifique suas credenciais ou crie uma conta se ainda não tiver.'
          } else if (errorMessage.includes('Email not confirmed')) {
            errorMessage = 'Email não confirmado. Verifique sua caixa de entrada e confirme seu email antes de fazer login.'
          } else {
            errorMessage = 'Erro ao fazer login. Verifique suas credenciais e tente novamente. Se não tem conta, clique em "Registre-se".'
          }
        } else if (response.status === 429) {
          errorMessage = data?.error || 'Muitas tentativas. Aguarde alguns minutos e tente novamente.'
        } else if (response.status === 500) {
          errorMessage = 'Erro no servidor. Verifique se as variáveis de ambiente estão configuradas corretamente.'
        }
        
        console.error('Erro no login:', {
          status: response.status,
          error: errorMessage,
          data
        })
        
        setError(errorMessage)
        setLoading(false)
        return
      }

      // IMPORTANTE: Salva a sessão no cliente Supabase
      // Isso garante que a sessão seja mantida entre requisições
      if (data.session) {
        // Cria cliente Supabase diretamente no cliente (sem importar createBrowserClient)
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
        
        if (supabaseUrl && supabaseAnonKey) {
          const supabase = createClient(supabaseUrl, supabaseAnonKey, {
            auth: {
              storage: typeof window !== 'undefined' ? window.localStorage : undefined,
              autoRefreshToken: true,
              persistSession: true,
              detectSessionInUrl: false,
            },
          })

          const { error: sessionError } = await supabase.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token || '',
          })

          if (sessionError) {
            console.error('Erro ao salvar sessão no cliente:', sessionError)
            setError('Erro ao salvar sessão. Tente novamente.')
            setLoading(false)
            return
          }

          console.log('Sessão salva com sucesso no cliente')
        }
      }

      // Redireciona para o dashboard
      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      console.error('Erro no login:', err)
      setError('Erro ao conectar com o servidor. Verifique sua conexão e tente novamente.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-md">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Meu Gestor
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Faça login para acessar seu painel
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
              {error}
            </div>
          )}
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Senha
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </div>

          <div className="text-center">
            <a
              href="/register"
              className="text-sm text-indigo-600 hover:text-indigo-500"
            >
              Não tem conta? Registre-se
            </a>
          </div>
        </form>
      </div>
    </div>
  )
}
