'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'
import { generateMonthlyReportPDF } from '@/lib/utils/generate-pdf-report'
import type { Financeiro } from '@/lib/db/types'

interface ExportPDFButtonProps {
  receitas: Financeiro[]
  despesas: Financeiro[]
  todasTransacoes: Financeiro[]
  totalReceitas: number
  totalDespesas: number
  saldo: number
  mes: string
  ano: number
}

export function ExportPDFButton({
  receitas,
  despesas,
  todasTransacoes,
  totalReceitas,
  totalDespesas,
  saldo,
  mes,
  ano,
}: ExportPDFButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false)

  const handleExport = () => {
    setIsGenerating(true)
    try {
      generateMonthlyReportPDF({
        receitas,
        despesas,
        todasTransacoes,
        totalReceitas,
        totalDespesas,
        saldo,
        mes,
        ano,
      })
    } catch (error) {
      console.error('Erro ao gerar PDF:', error)
      alert('Erro ao gerar PDF. Tente novamente.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={isGenerating}
      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
    >
      <Download className="w-4 h-4" />
      {isGenerating ? 'Gerando PDF...' : 'Exportar PDF'}
    </button>
  )
}
