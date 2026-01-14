'use client'

import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

interface ChartsProps {
  dadosGrafico: Array<{ date: string; total: number }>
  dadosPorCategoria: Array<{ name: string; value: number }>
  cores: string[]
}

export function Charts({ dadosGrafico, dadosPorCategoria, cores }: ChartsProps) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return (
    <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
      {/* Gráfico de Barras - Últimos 7 dias */}
      <div className="bg-white rounded-lg shadow-sm sm:shadow p-4 sm:p-6">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
          Gastos dos Últimos 7 Dias
        </h2>
        <div className="w-full" style={{ height: isMobile ? '220px' : '250px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dadosGrafico} margin={{ top: 5, right: 5, left: isMobile ? -15 : -20, bottom: isMobile ? 40 : 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: isMobile ? 10 : 12 }}
                angle={isMobile ? -45 : 0}
                textAnchor={isMobile ? "end" : "middle"}
                height={isMobile ? 60 : 30}
              />
              <YAxis 
                tick={{ fontSize: isMobile ? 10 : 12 }}
                width={isMobile ? 40 : 50}
              />
              <Tooltip 
                formatter={(value: number) => `R$ ${value.toFixed(2)}`}
                contentStyle={{ fontSize: isMobile ? '11px' : '12px', padding: isMobile ? '6px' : '8px' }}
              />
              <Bar dataKey="total" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Gráfico de Pizza - Por Categoria */}
      <div className="bg-white rounded-lg shadow-sm sm:shadow p-4 sm:p-6">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
          Gastos por Categoria
        </h2>
        {dadosPorCategoria.length > 0 ? (
          <div className="w-full" style={{ height: isMobile ? '220px' : '250px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dadosPorCategoria}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => {
                    return isMobile 
                      ? `${(percent * 100).toFixed(0)}%`
                      : `${name} ${(percent * 100).toFixed(0)}%`
                  }}
                  outerRadius={isMobile ? 60 : 80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {dadosPorCategoria.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={cores[index % cores.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => `R$ ${value.toFixed(2)}`}
                  contentStyle={{ fontSize: isMobile ? '11px' : '12px', padding: isMobile ? '6px' : '8px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-12 sm:py-16 text-sm sm:text-base">
            Nenhum dado para exibir
          </p>
        )}
      </div>
    </div>
  )
}
