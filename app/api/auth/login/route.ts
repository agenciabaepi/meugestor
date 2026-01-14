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

    // Valida configuração do Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    console.log('Configuração Supabase:', {
      url: supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'NÃO CONFIGURADO',
      anonKey: supabaseAnonKey ? `${supabaseAnonKey.substring(0, 10)}...` : 'NÃO CONFIGURADO',
    })

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Erro: Variáveis de ambiente do Supabase não configuradas')
      return NextResponse.json(
        { error: 'Erro de configuração do servidor' },
        { status: 500 }
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

    const emailNormalized = email.trim().toLowerCase()
    console.log('Tentando fazer login no Supabase Auth...', {
      email: emailNormalized,
      emailLength: emailNormalized.length,
      passwordLength: password.length,
    })

    // Faz login no Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailNormalized,
      password,
    })

    if (error) {
      console.error('=== ERRO NO SUPABASE AUTH ===')
      console.error('Detalhes completos do erro:', {
        message: error.message,
        status: error.status,
        name: error.name,
        email: emailNormalized,
        errorObject: JSON.stringify(error, Object.getOwnPropertyNames(error)),
      })
      
      // Tenta buscar informações adicionais
      try {
        const { data: userData } = await supabase.auth.admin.getUserByEmail(emailNormalized)
        console.log('Informações do usuário (se encontrado):', userData ? 'Usuário existe' : 'Usuário não encontrado')
      } catch (adminError) {
        console.log('Não foi possível verificar usuário (normal se não for admin)')
      }

      // Mensagens de erro mais amigáveis
      let errorMessage = 'Email ou senha incorretos'
      
      // Verifica tipos específicos de erro
      if (error.message.includes('Invalid login credentials')) {
        errorMessage = 'Email ou senha incorretos. Verifique suas credenciais.'
      } else if (error.message.includes('Email not confirmed')) {
        errorMessage = 'Email não confirmado. Verifique sua caixa de entrada.'
      } else if (error.message.includes('rate limit') || 
                 error.message.includes('too many requests')) {
        errorMessage = 'Erro ao fazer login. Tente novamente em alguns instantes.'
      } else if (error.message) {
        // Para outros erros, usa a mensagem do Supabase mas de forma genérica
        errorMessage = 'Email ou senha incorretos. Verifique suas credenciais.'
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
      sessionExpiresAt: data.session.expires_at,
    })

    // IMPORTANTE: O Supabase deve salvar a sessão automaticamente via setItem no storage
    // Mas vamos garantir que a sessão está configurada corretamente
    await supabase.auth.setSession(data.session)

    // Verifica se a sessão foi salva
    const { data: { session: savedSession } } = await supabase.auth.getSession()
    
    if (!savedSession) {
      console.error('AVISO: Sessão não foi salva após setSession')
    } else {
      console.log('Sessão confirmada como salva')
    }

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
