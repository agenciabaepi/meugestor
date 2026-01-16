'use client'

import { useMemo, useState } from 'react'
import { DonutGastosChart, type DonutGastosData } from '../components/DonutGastosChart'

type Props = {
  donutDespesas: DonutGastosData
  donutReceitas: DonutGastosData
}

type TabKey = 'despesas' | 'receitas'

function safeData(input: DonutGastosData): DonutGastosData {
  const total = Number.isFinite(input.total) ? input.total : 0
  const categorias = (input.categorias || []).filter((c) => Number.isFinite(c.valor) && c.valor > 0)
  return { total, categorias }
}

export function FinanceiroDonutTabs({ donutDespesas, donutReceitas }: Props) {
  const [active, setActive] = useState<TabKey>('despesas')
  const [selectedDespesas, setSelectedDespesas] = useState<string | null>(null)
  const [selectedReceitas, setSelectedReceitas] = useState<string | null>(null)

  const despesas = useMemo(() => safeData(donutDespesas), [donutDespesas])
  const receitas = useMemo(() => safeData(donutReceitas), [donutReceitas])

  const selected = active === 'despesas' ? selectedDespesas : selectedReceitas
  const current = active === 'despesas' ? despesas : receitas

  const selectedValue = useMemo(() => {
    if (!selected) return null
    const found = current.categorias.find((c) => c.nome === selected)
    return found ? Number(found.valor) : null
  }, [selected, current.categorias])

  return (
    <div
      className="overflow-hidden rounded-2xl shadow-lg border border-emerald-950/10"
      onClick={() => {
        if (active === 'despesas') setSelectedDespesas(null)
        else setSelectedReceitas(null)
      }}
    >
      <div className="bg-linear-to-br from-emerald-950 via-emerald-900 to-emerald-800">
        <div className="px-5 sm:px-6 pt-5 sm:pt-6 text-center">
          <h2 className="text-white text-lg sm:text-xl font-bold tracking-tight">Resumo por categoria</h2>
          <p className="text-white/75 text-sm sm:text-base mt-1">
            Toque em um segmento ou ícone para ver o valor da categoria
          </p>

          {/* Abas (donuts) */}
          <div className="mt-4 flex justify-center">
            <div className="inline-flex rounded-full bg-white/10 p-1 ring-1 ring-white/15">
            <button
              type="button"
              className={[
                'px-4 py-2 rounded-full text-sm font-semibold transition',
                active === 'despesas' ? 'bg-white/20 text-white' : 'text-white/80 hover:text-white',
              ].join(' ')}
              onClick={(e) => {
                e.stopPropagation()
                setActive('despesas')
              }}
            >
              Despesas
            </button>
            <button
              type="button"
              className={[
                'px-4 py-2 rounded-full text-sm font-semibold transition',
                active === 'receitas' ? 'bg-white/20 text-white' : 'text-white/80 hover:text-white',
              ].join(' ')}
              onClick={(e) => {
                e.stopPropagation()
                setActive('receitas')
              }}
            >
              Receitas
            </button>
            </div>
          </div>
        </div>

        {/* Conteúdo interativo do gráfico (não dispara o "click fora") */}
        <div className="px-4 sm:px-6 py-4 sm:py-6" onClick={(e) => e.stopPropagation()}>
          <DonutGastosChart
            data={current}
            variant="dark"
            selectedCategory={selected}
            centerTitle={selected ? selected : active === 'despesas' ? 'Gasto total' : 'Receita total'}
            centerValue={selectedValue ?? undefined}
            gapDegrees={3.25}
            showCenterButton={false}
            onSelectCategory={(nome) => {
              if (active === 'despesas') setSelectedDespesas((prev) => (prev === nome ? null : nome))
              else setSelectedReceitas((prev) => (prev === nome ? null : nome))
            }}
          />
        </div>
      </div>
    </div>
  )
}

