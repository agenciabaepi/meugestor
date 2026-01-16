'use client'

import { useCallback } from 'react'
import { DonutGastosDashboardCard } from './DonutGastosDashboardCard'
import type { DonutGastosData } from './DonutGastosChart'

type Props = {
  donutData: DonutGastosData
}

/**
 * Wrapper client para manter interatividade (event handlers) fora do Server Component.
 * Importante: NÃO chama IA, apenas UI.
 */
export function DashboardDonutSection({ donutData }: Props) {
  const handleSelectCategory = useCallback((nome: string) => {
    // Hook pronto pra integração futura (ex: filtrar lista, abrir modal, navegar com querystring, etc.)
    console.log('onSelectCategory:', nome)
  }, [])

  return <DonutGastosDashboardCard data={donutData} onSelectCategory={handleSelectCategory} />
}

