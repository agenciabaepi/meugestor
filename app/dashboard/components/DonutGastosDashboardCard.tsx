'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DonutGastosChart, type DonutGastosData } from './DonutGastosChart'

type Props = {
  /**
   * Dados já calculados (sem dependência de IA/chat).
   */
  data: DonutGastosData
  /**
   * Callback UI quando usuário seleciona uma categoria.
   */
  onSelectCategory?: (nome: string) => void
  /**
   * Rota para tela de transações (default: /dashboard/financeiro).
   */
  transactionsHref?: string
}

export function DonutGastosDashboardCard({
  data,
  onSelectCategory,
  transactionsHref = '/dashboard/financeiro',
}: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState<string | null>(null)

  const safeData = useMemo(() => {
    // Evita NaN e mantém o componente estável.
    const total = Number.isFinite(data.total) ? data.total : 0
    const categorias = (data.categorias || []).filter((c) => Number.isFinite(c.valor) && c.valor > 0)
    return { total, categorias }
  }, [data])

  const selectedValue = useMemo(() => {
    if (!selected) return null
    const found = safeData.categorias.find((c) => c.nome === selected)
    return found ? Number(found.valor) : null
  }, [selected, safeData.categorias])

  return (
    <div
      className="overflow-hidden rounded-2xl shadow-lg border border-emerald-950/10"
      onClick={() => setSelected(null)}
    >
      <div className="bg-linear-to-br from-emerald-950 via-emerald-900 to-emerald-800">
        <div className="px-5 sm:px-6 pt-5 sm:pt-6">
          <h2 className="text-white text-lg sm:text-xl font-bold tracking-tight">
            Gastos do mês por categoria
          </h2>
          <p className="text-white/75 text-sm sm:text-base mt-1">
            Toque em um segmento ou ícone para filtrar
          </p>
        </div>

        {/* Conteúdo interativo do gráfico (não dispara o "click fora") */}
        <div className="px-4 sm:px-6 py-4 sm:py-6" onClick={(e) => e.stopPropagation()}>
          <DonutGastosChart
            data={safeData}
            variant="dark"
            selectedCategory={selected}
            centerTitle={selected ? selected : 'Gasto total'}
            centerValue={selectedValue ?? undefined}
            gapDegrees={3.25}
            onSelectCategory={(nome) => {
              setSelected((prev) => (prev === nome ? null : nome))
              onSelectCategory?.(nome)
            }}
            onViewTransactions={() => {
              router.push(transactionsHref)
            }}
          />
        </div>
      </div>
    </div>
  )
}

