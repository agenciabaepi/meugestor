import { NextRequest, NextResponse } from 'next/server'
import { getSessionContext } from '@/lib/utils/session-context'
import {
  updateFinanceiroRecordForContext,
  deleteFinanceiroRecordForContext,
  getFinanceiroRecordByIdForContext,
} from '@/lib/services/financeiro'

// GET - Obter transação por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const ctx = await getSessionContext()

    if (!ctx) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const transacao = await getFinanceiroRecordByIdForContext(ctx, id)

    if (!transacao) {
      return NextResponse.json({ error: 'Transação não encontrada' }, { status: 404 })
    }

    return NextResponse.json(transacao)
  } catch (error) {
    console.error('Error fetching transacao:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar transação' },
      { status: 500 }
    )
  }
}

// PUT - Atualizar transação
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const ctx = await getSessionContext()

    if (!ctx) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const { amount, description, category, subcategory, date, tags, transactionType } = body

    const updated = await updateFinanceiroRecordForContext(ctx, id, {
      amount,
      description,
      category,
      subcategory,
      date,
      tags,
      transactionType,
    })

    return NextResponse.json(updated)
  } catch (error: any) {
    console.error('Error updating transacao:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao atualizar transação' },
      { status: 400 }
    )
  }
}

// DELETE - Deletar transação
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const ctx = await getSessionContext()

    if (!ctx) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const deleted = await deleteFinanceiroRecordForContext(ctx, id)

    if (!deleted) {
      return NextResponse.json({ error: 'Erro ao deletar transação' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting transacao:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao deletar transação' },
      { status: 400 }
    )
  }
}