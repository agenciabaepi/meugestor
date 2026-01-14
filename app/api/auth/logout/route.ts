import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/db/client'

/**
 * POST - Logout do usuário
 */
export async function POST(request: NextRequest) {
  try {
    // Cria cliente Supabase com suporte a cookies
    const supabase = await createServerClient()
    
    const { error } = await supabase.auth.signOut()

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro no logout:', error)
    return NextResponse.json(
      { error: 'Erro ao fazer logout' },
      { status: 500 }
    )
  }
}
