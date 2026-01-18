import { getSessionContext } from '@/lib/utils/session-context'
import { getFinanceiroRecordByIdForContext } from '@/lib/services/financeiro'
import { redirect } from 'next/navigation'
import { EditarTransacao } from './EditarTransacao'

export default async function EditarTransacaoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const ctx = await getSessionContext()

  if (!ctx) {
    redirect('/dashboard/financeiro')
  }

  const transacao = await getFinanceiroRecordByIdForContext(ctx, id)

  if (!transacao) {
    redirect('/dashboard/financeiro')
  }

  return <EditarTransacao transacao={transacao} />
}