'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  ComposedChart,
  AreaChart,
} from 'recharts'

interface DashboardChartProps {
  data: Array<{ date: string; despesas: number; receitas: number; saldo?: number }>
}

export function DashboardChart({ data }: DashboardChartProps) {
  // Formata o valor para exibir no tooltip
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  // Tooltip customizado e moderno
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const despesas = payload.find((p: any) => p.dataKey === 'despesas')?.value || 0
      const receitas = payload.find((p: any) => p.dataKey === 'receitas')?.value || 0
      const saldo = receitas - despesas

      return (
        <div className="bg-white p-4 border-2 border-gray-200 rounded-xl shadow-2xl backdrop-blur-sm">
          <p className="font-bold text-gray-900 mb-3 text-base">{label}</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gradient-to-r from-green-500 to-emerald-600"></div>
                <span className="text-sm font-medium text-gray-700">Receitas:</span>
              </div>
              <span className="text-sm font-bold text-green-600">
                {formatCurrency(receitas)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gradient-to-r from-red-500 to-rose-600"></div>
                <span className="text-sm font-medium text-gray-700">Despesas:</span>
              </div>
              <span className="text-sm font-bold text-red-600">
                {formatCurrency(despesas)}
              </span>
            </div>
            <div className="border-t-2 border-gray-200 mt-3 pt-3">
              <div className="flex items-center justify-between gap-6">
                <span className="text-sm font-semibold text-gray-900">Saldo do Dia:</span>
                <span className={`text-base font-bold ${saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(saldo)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  // Calcula saldo para cada ponto
  const dataWithSaldo = data.map(item => ({
    ...item,
    saldo: (item.receitas || 0) - (item.despesas || 0)
  }))

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={450}>
        <AreaChart
          data={dataWithSaldo}
          margin={{
            top: 10,
            right: 30,
            left: 0,
            bottom: 10,
          }}
        >
          <defs>
            <linearGradient id="colorReceitas" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.05}/>
            </linearGradient>
            <linearGradient id="colorDespesas" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0.05}/>
            </linearGradient>
          </defs>
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="#e5e7eb" 
            vertical={false}
            opacity={0.5}
          />
          <XAxis
            dataKey="date"
            tick={{ fill: '#6b7280', fontSize: 11, fontWeight: 500 }}
            axisLine={{ stroke: '#e5e7eb', strokeWidth: 2 }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: '#6b7280', fontSize: 12, fontWeight: 500 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) => {
              if (value >= 1000) {
                return `R$ ${(value / 1000).toFixed(1)}k`
              }
              return `R$ ${value}`
            }}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '5 5' }} />
          <Legend
            wrapperStyle={{ paddingTop: '20px', paddingBottom: '10px' }}
            iconType="circle"
            formatter={(value) => {
              if (value === 'receitas') return <span className="font-semibold">Receitas</span>
              if (value === 'despesas') return <span className="font-semibold">Despesas</span>
              return value
            }}
          />
          
          {/* Área de Receitas */}
          <Area
            type="monotone"
            dataKey="receitas"
            stroke="#10b981"
            strokeWidth={3}
            fill="url(#colorReceitas)"
            dot={{ fill: '#10b981', r: 4, strokeWidth: 2, stroke: '#ffffff' }}
            activeDot={{ r: 6, strokeWidth: 2, stroke: '#ffffff', fill: '#059669' }}
            name="receitas"
          />
          
          {/* Área de Despesas */}
          <Area
            type="monotone"
            dataKey="despesas"
            stroke="#ef4444"
            strokeWidth={3}
            fill="url(#colorDespesas)"
            dot={{ fill: '#ef4444', r: 4, strokeWidth: 2, stroke: '#ffffff' }}
            activeDot={{ r: 6, strokeWidth: 2, stroke: '#ffffff', fill: '#dc2626' }}
            name="despesas"
          />
          
          {/* Linha de Saldo (opcional - pode ser comentada se não quiser) */}
          <Line
            type="monotone"
            dataKey="saldo"
            stroke="#3b82f6"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
            activeDot={{ r: 5 }}
            name="saldo"
            legendType="none"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
