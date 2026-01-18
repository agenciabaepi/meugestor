import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseAdmin } from '@/lib/db/client'
import { getUserRowById } from '@/lib/db/user-profile'

/**
 * PATCH - Atualiza dados de uma empresa
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // Descobre tenant_id do usuário
    const row = await getUserRowById(supabaseAdmin as any, session.user.id)
    const tenantId = row?.user?.tenant_id
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant não encontrado' }, { status: 401 })
    }

    const { id: empresaId } = await params
    const body = await request.json()
    const { nome_fantasia, razao_social, cnpj } = body

    if (!nome_fantasia || nome_fantasia.trim().length === 0) {
      return NextResponse.json(
        { error: 'Nome fantasia é obrigatório' },
        { status: 400 }
      )
    }

    // Verifica se a empresa pertence ao tenant do usuário
    const { data: empresa, error: checkError } = await supabaseAdmin
      .from('empresas')
      .select('id, tenant_id')
      .eq('id', empresaId)
      .eq('tenant_id', tenantId)
      .single()

    if (checkError || !empresa) {
      return NextResponse.json(
        { error: 'Empresa não encontrada ou sem permissão' },
        { status: 404 }
      )
    }

    // Atualiza a empresa
    const updateData: any = {
      nome_fantasia: nome_fantasia.trim(),
    }
    if (razao_social !== undefined) {
      updateData.razao_social = razao_social ? razao_social.trim() : null
    }
    if (cnpj !== undefined) {
      updateData.cnpj = cnpj ? cnpj.trim() : null
    }

    const { data, error } = await supabaseAdmin
      .from('empresas')
      .update(updateData)
      .eq('id', empresaId)
      .eq('tenant_id', tenantId)
      .select('id, nome_fantasia, razao_social, cnpj')
      .single()

    if (error) {
      console.error('Erro ao atualizar empresa:', error)
      return NextResponse.json(
        { error: 'Erro ao atualizar empresa' },
        { status: 500 }
      )
    }

    return NextResponse.json({ empresa: data })
  } catch (error) {
    console.error('Erro ao atualizar empresa:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar empresa' },
      { status: 500 }
    )
  }
}
