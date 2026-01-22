'use client'

import type { Funcionario, Financeiro } from '@/lib/db/types'
import { formatCurrency } from '@/lib/utils/format-currency'
import { Calendar, DollarSign, CheckCircle2, Clock } from 'lucide-react'

interface FuncionarioDetalhesProps {
  funcionario: Funcionario
  pagamentos: Financeiro[]
}

export function FuncionarioDetalhes({ funcionario, pagamentos }: FuncionarioDetalhesProps) {
  if (pagamentos.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
          <DollarSign className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Nenhum pagamento registrado
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          Este funcionário ainda não possui pagamentos registrados.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-750">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Calendar className="w-5 h-5 text-emerald-600" />
          Histórico de Pagamentos
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {pagamentos.length} {pagamentos.length === 1 ? 'pagamento registrado' : 'pagamentos registrados'}
        </p>
      </div>
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {pagamentos.map((pagamento) => {
          const pagamentoDate = new Date(pagamento.date)
          const isRecent = new Date().getTime() - pagamentoDate.getTime() < 7 * 24 * 60 * 60 * 1000

          return (
            <div
              key={pagamento.id}
              className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
            >
              <div className="flex items-start gap-4">
                {/* Ícone de Status */}
                <div
                  className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                    pagamento.pago
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                      : 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
                  }`}
                >
                  {pagamento.pago ? (
                    <CheckCircle2 className="w-6 h-6" />
                  ) : (
                    <Clock className="w-6 h-6" />
                  )}
                </div>

                {/* Conteúdo */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <p className="text-xl font-bold text-gray-900 dark:text-white">
                          {formatCurrency(Number(pagamento.amount))}
                        </p>
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                            pagamento.pago
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
                          }`}
                        >
                          {pagamento.pago ? 'Pago' : 'Pendente'}
                        </span>
                        {isRecent && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                            Recente
                          </span>
                        )}
                      </div>
                      {pagamento.description && (
                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-3 font-medium">
                          {pagamento.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Metadados */}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      <span className="font-medium">
                        {pagamentoDate.toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                    {pagamento.category && (
                      <div className="px-2.5 py-1 bg-gray-100 dark:bg-gray-700 rounded-md font-medium">
                        {pagamento.category}
                      </div>
                    )}
                    {pagamento.subcategory && (
                      <div className="px-2.5 py-1 bg-gray-100 dark:bg-gray-700 rounded-md font-medium">
                        {pagamento.subcategory}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
