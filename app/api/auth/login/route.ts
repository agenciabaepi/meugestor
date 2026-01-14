import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/db/client'

/**
 * POST - Login do usuário
 */
export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email e senha são obrigatórios' },
        { status: 400 }
      )
    }

    // Cria cliente Supabase com suporte a cookies
    const supabase = await createServerClient()

    // Faz login no Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      )
    }

    // Retorna dados do usuário
    return NextResponse.json({
      user: data.user,
      session: data.session,
    })
  } catch (error) {
    console.error('Erro no login:', error)
    return NextResponse.json(
      { error: 'Erro ao fazer login' },
      { status: 500 }
    )
  }
}
