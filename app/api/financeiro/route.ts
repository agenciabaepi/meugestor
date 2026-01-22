import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/db/client'
import { getSessionContext } from '@/lib/utils/session-context'
import { createFinanceiroRecordForContext } from '@/lib/services/financeiro'
import { ValidationError } from '@/lib/utils/errors'

/**
 * POST - Cria um novo registro financeiro (despesa ou receita)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const ctx = await getSessionContext()
    if (!ctx) {
      return NextResponse.json({ error: 'Erro ao carregar contexto' }, { status: 500 })
    }

    const body = await request.json()
    const {
      amount,
      description,
      category,
      date,
      subcategory,
      transactionType = 'expense',
      tags,
      metadata,
      receiptImageUrl,
      pago,
      funcionario_id,
    } = body

    // Validações básicas
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Valor deve ser maior que zero' }, { status: 400 })
    }

    if (!description || String(description).trim().length === 0) {
      return NextResponse.json({ error: 'Descrição é obrigatória' }, { status: 400 })
    }

    if (!category || String(category).trim().length === 0) {
      return NextResponse.json({ error: 'Categoria é obrigatória' }, { status: 400 })
    }

    if (!date) {
      return NextResponse.json({ error: 'Data é obrigatória' }, { status: 400 })
    }

    if (transactionType !== 'expense' && transactionType !== 'revenue') {
      return NextResponse.json(
        { error: 'Tipo de transação deve ser "expense" ou "revenue"' },
        { status: 400 }
      )
    }

    // Cria o registro
    try {
      const record = await createFinanceiroRecordForContext(ctx, {
        userId: session.user.id,
        amount: Number(amount),
        description: String(description).trim(),
        category: String(category).trim(),
        date: String(date),
        subcategory: subcategory ? String(subcategory).trim() : null,
        transactionType: transactionType as 'expense' | 'revenue',
        tags: Array.isArray(tags) ? tags : null,
        metadata: metadata || null,
        receiptImageUrl: receiptImageUrl || null,
        pago: pago !== undefined ? Boolean(pago) : (transactionType === 'expense' ? true : false),
        funcionario_id: funcionario_id ? String(funcionario_id).trim() : null,
      })

      return NextResponse.json({ success: true, data: record }, { status: 201 })
    } catch (error: any) {
      if (error instanceof ValidationError) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
      console.error('Erro ao criar registro financeiro:', error)
      return NextResponse.json(
        { error: 'Erro ao criar registro financeiro' },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Erro na API financeiro:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
