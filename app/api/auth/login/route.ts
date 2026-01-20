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
      urlLength: supabaseUrl?.length || 0,
      anonKeyLength: supabaseAnonKey?.length || 0,
    })

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Erro: Variáveis de ambiente do Supabase não configuradas')
      console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'configurado' : 'FALTANDO')
      console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'configurado' : 'FALTANDO')
      return NextResponse.json(
        { error: 'Erro de configuração do servidor. Verifique as variáveis de ambiente.' },
        { status: 500 }
      )
    }

    // Cria cliente Supabase com suporte a cookies
    let supabase
    try {
      supabase = await createServerClient()
    } catch (clientError: any) {
      console.error('Erro ao criar cliente Supabase:', clientError?.message || clientError)
      return NextResponse.json(
        { error: 'Erro de configuração do servidor' },
        { status: 500 }
      )
    }

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
      supabaseUrl: supabaseUrl ? 'configurado' : 'não configurado',
    })

    // Faz login no Supabase Auth
    let data, error
    try {
      const result = await supabase.auth.signInWithPassword({
        email: emailNormalized,
        password,
      })
      data = result.data
      error = result.error
    } catch (authError: any) {
      console.error('Erro ao chamar signInWithPassword:', authError?.message || authError)
      return NextResponse.json(
        { error: 'Erro ao fazer login. Tente novamente.' },
        { status: 500 }
      )
    }

    if (error) {
      console.error('=== ERRO NO SUPABASE AUTH ===')
      console.error('Detalhes completos do erro:', {
        message: error.message,
        status: error.status,
        name: error.name,
        email: emailNormalized,
        errorObject: JSON.stringify(error, Object.getOwnPropertyNames(error)),
      })

      // Mensagens de erro mais amigáveis
      let errorMessage = 'Email ou senha incorretos'
      let httpStatus = (typeof error.status === 'number' ? error.status : 401) as number
      
      // Verifica tipos específicos de erro
      if (error.status === 429 || 
          error.message?.includes('rate limit') || 
          error.message?.includes('too many requests') ||
          error.message?.includes('Request rate limit reached')) {
        errorMessage = 'Muitas tentativas de login. Por favor, aguarde alguns minutos antes de tentar novamente.'
        httpStatus = 429
      } else if (error.message?.includes('Invalid login credentials') || 
                 error.message?.includes('invalid_credentials') ||
                 error.status === 400) {
        errorMessage = 'Email ou senha incorretos. Verifique suas credenciais ou crie uma conta se ainda não tiver.'
        httpStatus = 401
      } else if (error.message?.includes('Email not confirmed') || 
                 error.message?.includes('email_not_confirmed')) {
        errorMessage = 'Email não confirmado. Verifique sua caixa de entrada e confirme seu email antes de fazer login.'
        httpStatus = 401
      } else if (error.message?.includes('User not found')) {
        errorMessage = 'Usuário não encontrado. Verifique seu email ou crie uma conta.'
        httpStatus = 401
      } else if (error.message) {
        // Para outros erros, usa a mensagem do Supabase mas de forma genérica
        errorMessage = `Erro ao fazer login: ${error.message}. Verifique suas credenciais.`
        // Mantém o status se vier do Supabase, mas evita retornar 400 genérico como auth.
        if (![400, 401, 403, 429].includes(httpStatus)) httpStatus = 500
      }

      return NextResponse.json(
        { error: errorMessage, code: (error as any).code ?? null },
        { status: httpStatus }
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

    // O signInWithPassword já persiste a sessão no storage configurado (cookies).
    // Evita chamar setSession novamente para não gerar rotação/concorrência de refresh token.

    // Retorna dados do usuário
    // IMPORTANTE: Inclui refresh_token para manter a sessão ativa
    return NextResponse.json({
      user: {
        id: data.user.id,
        email: data.user.email,
      },
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
        expires_in: data.session.expires_in,
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
