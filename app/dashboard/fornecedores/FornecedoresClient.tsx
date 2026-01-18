'use client'

import type { Fornecedor } from '@/lib/db/types'

interface FornecedoresClientProps {
  fornecedores: Fornecedor[]
}

export function FornecedoresClient({ fornecedores }: FornecedoresClientProps) {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Fornecedores</h1>
      
      <div className="bg-white rounded-lg shadow p-6">
        {fornecedores.length === 0 ? (
          <p className="text-gray-600">Nenhum fornecedor cadastrado ainda.</p>
        ) : (
          <div className="space-y-4">
            {fornecedores.map((fornecedor) => (
              <div key={fornecedor.id} className="border-b pb-4 last:border-b-0">
                <h3 className="font-semibold text-gray-900">{fornecedor.nome}</h3>
                {fornecedor.telefone && (
                  <p className="text-sm text-gray-600">Tel: {fornecedor.telefone}</p>
                )}
                {fornecedor.email && (
                  <p className="text-sm text-gray-600">Email: {fornecedor.email}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
