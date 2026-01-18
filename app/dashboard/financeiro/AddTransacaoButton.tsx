'use client'

import { useState } from 'react'
import { Plus, TrendingUp, TrendingDown } from 'lucide-react'
import { AddTransacaoModal } from './AddTransacaoModal'

export function AddTransacaoButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [tipo, setTipo] = useState<'expense' | 'revenue'>('expense')

  const openModal = (tipoTransacao: 'expense' | 'revenue') => {
    setTipo(tipoTransacao)
    setIsOpen(true)
  }

  return (
    <>
      <div className="flex gap-2 sm:gap-3">
        {/* Botão Receita */}
        <button
          onClick={() => openModal('revenue')}
          className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all duration-200 shadow-sm hover:shadow-md font-medium text-sm sm:text-base"
        >
          <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="hidden sm:inline">Adicionar Receita</span>
          <span className="sm:hidden">Receita</span>
        </button>

        {/* Botão Despesa */}
        <button
          onClick={() => openModal('expense')}
          className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-200 shadow-sm hover:shadow-md font-medium text-sm sm:text-base"
        >
          <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="hidden sm:inline">Adicionar Despesa</span>
          <span className="sm:hidden">Despesa</span>
        </button>
      </div>

      <AddTransacaoModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        tipo={tipo}
      />
    </>
  )
}
