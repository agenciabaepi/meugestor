import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/db/client'

/**
 * POST - Login do usuário
 */
export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    console.log('=== LOGIN ATTEMPT ===')
    console.log('Email:', email ? `${email.substring(0, 3)}***` : 'não fornecido')

    if (!email || !password) {
      console.log('Erro: Email ou senha não fornecidos')
      return NextResponse.json(
        { error: 'Email e senha são obrigatórios' },
        { status: 400 }
      )
    }

    // Valida formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      console.log('Erro: Email inválido')
      return NextResponse.json(
        { error: 'Email inválido' },
        { status: 400 }
      )
    }

    // Cria cliente Supabase com suporte a cookies
    const supabase = await createServerClient()

    if (!supabase) {
      console.error('Erro: Cliente Supabase não foi criado')
      return NextResponse.json(
        { error: 'Erro de configuração do servidor' },
        { status: 500 }
      )
    }

    console.log('Tentando fazer login no Supabase Auth...')

    // Faz login no Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })

    if (error) {
      console.error('Erro no Supabase Auth:', {
        message: error.message,
        status: error.status,
        name: error.name,
      })

      // Mensagens de erro mais amigáveis
      let errorMessage = 'Erro ao fazer login'
      
      if (error.message.includes('Invalid login credentials') || 
          error.message.includes('Email not confirmed') ||
          error.status === 400) {
        errorMessage = 'Email ou senha incorretos'
      } else if (error.message.includes('rate limit') || 
                 error.message.includes('too many requests')) {
        errorMessage = 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.'
      } else {
        errorMessage = error.message || 'Erro ao fazer login'
      }

      return NextResponse.json(
        { error: errorMessage },
        { status: 401 }
      )
    }

    if (!data.user || !data.session) {
      console.error('Erro: Login retornou sem usuário ou sessão')
      return NextResponse.json(
        { error: 'Erro ao criar sessão' },
        { status: 500 }
      )
    }

    console.log('Login bem-sucedido:', {
      userId: data.user.id,
      email: data.user.email,
    })

    // Retorna dados do usuário
    return NextResponse.json({
      user: {
        id: data.user.id,
        email: data.user.email,
      },
      session: {
        access_token: data.session.access_token,
        expires_at: data.session.expires_at,
      },
    })
  } catch (error) {
    console.error('Erro inesperado no login:', error)
    return NextResponse.json(
      { error: 'Erro ao fazer login. Tente novamente.' },
      { status: 500 }
    )
  }
}
