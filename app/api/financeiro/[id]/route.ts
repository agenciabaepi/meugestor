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
    const { amount, description, category, subcategory, date, tags, transactionType, pago } = body

    // Para despesas: usa o valor de pago se fornecido, caso contrário mantém true
    // Para receitas: sempre true (receitas são sempre consideradas recebidas)
    const pagoValue = transactionType === 'expense' 
      ? (pago !== undefined ? Boolean(pago) : undefined) 
      : true

    // Normaliza a data para evitar problemas de timezone
    let normalizedDate = date
    if (date) {
      normalizedDate = String(date).trim()
      if (normalizedDate.includes('T')) {
        normalizedDate = normalizedDate.split('T')[0]
      }
      // Valida formato YYYY-MM-DD
      if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate)) {
        return NextResponse.json({ error: 'Formato de data inválido. Use YYYY-MM-DD' }, { status: 400 })
      }
    }

    const updatePayload: any = {
      amount,
      description,
      category,
      subcategory,
      date: normalizedDate,
      tags,
      transactionType,
    }

    // Só inclui pago se foi fornecido explicitamente ou se for receita
    if (pagoValue !== undefined) {
      updatePayload.pago = pagoValue
    }

    const updated = await updateFinanceiroRecordForContext(ctx, id, updatePayload)

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