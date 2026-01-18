import { NextResponse } from 'next/server'
import { createServerClient, supabaseAdmin } from '@/lib/db/client'
import { getUserRowById } from '@/lib/db/user-profile'

/**
 * GET - Lista empresas do tenant do usuário autenticado
 */
export async function GET() {
  try {
    const supabase = await createServerClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Erro de configuração' }, { status: 500 })
    }

    // Usa o perfil (users/users_meugestor) para descobrir tenant_id de forma robusta
    const row = await getUserRowById(supabaseAdmin as any, session.user.id)
    const tenantId = row?.user?.tenant_id
    if (!tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { data, error } = await supabaseAdmin
      .from('empresas')
      .select('id, nome_fantasia, razao_social, cnpj, created_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    if (error) {
      // tolera ambiente sem tabela
      return NextResponse.json({ empresas: [] })
    }

    return NextResponse.json({ empresas: data || [] })
  } catch (e) {
    console.error('Erro ao listar empresas:', e)
    return NextResponse.json({ empresas: [] })
  }
}

