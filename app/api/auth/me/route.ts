import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseAdmin } from '@/lib/db/client'

/**
 * GET - Retorna dados do usuário autenticado
 */
export async function GET(request: NextRequest) {
  try {
    // Cria cliente Supabase com suporte a cookies
    const supabase = await createServerClient()
    
    // Obtém a sessão do cookie
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    // Busca dados completos do usuário
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Erro de configuração' },
        { status: 500 }
      )
    }

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('*, tenants(*)')
      .eq('id', session.user.id)
      .single()

    if (error) {
      console.error('Erro ao buscar usuário:', error)
      return NextResponse.json(
        { error: 'Erro ao buscar dados do usuário' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        whatsapp_number: user.whatsapp_number,
        role: user.role,
        tenant: user.tenants,
      },
      session,
    })
  } catch (error) {
    console.error('Erro ao buscar usuário:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar dados' },
      { status: 500 }
    )
  }
}
