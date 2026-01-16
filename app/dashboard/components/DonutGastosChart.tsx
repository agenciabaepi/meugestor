'use client'

import React, { useEffect, useMemo, useState } from 'react'

const DEFAULT_PALETTE = Object.freeze([
  '#3b82f6', // blue
  '#f97316', // orange
  '#a855f7', // purple
  '#22c55e', // green
  '#ef4444', // red
  '#14b8a6', // teal
  '#eab308', // yellow
  '#ec4899', // pink
  '#64748b', // slate
])

export type DonutCategoria = {
  nome: string
  valor: number
  icon?: string
  color?: string
}

export type DonutGastosData = {
  total: number
  categorias: DonutCategoria[]
}

type Props = {
  data: DonutGastosData
  onSelectCategory?: (nome: string) => void
  onViewTransactions?: () => void
  selectedCategory?: string | null
  /**
   * Valor exibido no centro (quando seleciona uma categoria, por ex).
   * Se não vier, mostramos o total.
   */
  centerValue?: number
  size?: number
  strokeWidth?: number
  gapDegrees?: number
  palette?: string[]
  variant?: 'dark' | 'light'
  centerTitle?: string
  viewTransactionsLabel?: string
}

function formatBRL(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 2,
  }).format(value || 0)
}

function defaultIconForCategory(nome: string) {
  const key = (nome || '').toLowerCase()
  if (key.includes('aliment')) return '🍔'
  if (key.includes('transp')) return '🚌'
  if (key.includes('morad') || key.includes('casa')) return '🏠'
  if (key.includes('lazer') || key.includes('entreten')) return '🎮'
  if (key.includes('saúd')) return '🩺'
  if (key.includes('educ')) return '🎓'
  if (key.includes('assin') || key.includes('servi')) return '🧾'
  if (key.includes('impost') || key.includes('tax')) return '🏛️'
  if (key.includes('pets')) return '🐶'
  if (key.includes('doa') || key.includes('pres')) return '🎁'
  if (key.includes('compr')) return '🛒'
  if (key.includes('trabal') || key.includes('negó')) return '💼'
  return '✨'
}

function defaultColorForCategory(nome: string) {
  const key = (nome || '').toLowerCase()
  if (key.includes('aliment')) return '#f97316' // laranja
  if (key.includes('transp')) return '#3b82f6' // azul
  if (key.includes('morad') || key.includes('casa')) return '#a855f7' // roxo
  if (key.includes('saúd')) return '#ef4444' // vermelho
  if (key.includes('educ')) return '#eab308' // amarelo
  if (key.includes('lazer') || key.includes('entreten')) return '#22c55e' // verde
  if (key.includes('compr')) return '#ec4899' // rosa
  if (key.includes('assin') || key.includes('servi')) return '#14b8a6' // teal
  if (key.includes('impost') || key.includes('tax')) return '#64748b' // slate
  if (key.includes('pets')) return '#8b5cf6'
  if (key.includes('doa') || key.includes('pres')) return '#f59e0b'
  if (key.includes('trabal') || key.includes('negó')) return '#0ea5e9'
  return '#10b981'
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

/**
 * Donut chart em SVG, sem libs:
 * - segmentos por categoria (proporcional ao valor)
 * - animação na montagem via strokeDasharray
 * - ícones posicionados no “mid angle” de cada segmento
 */
export function DonutGastosChart({
  data,
  onSelectCategory,
  onViewTransactions,
  selectedCategory,
  centerValue,
  size = 240,
  strokeWidth = 18,
  gapDegrees = 3.25,
  palette,
  variant = 'dark',
  centerTitle = 'Gasto total',
  viewTransactionsLabel = 'Ver transações',
}: Props) {
  const [mounted, setMounted] = useState(false)
  const [reduceMotion, setReduceMotion] = useState(false)
  const paletteStable = palette ?? DEFAULT_PALETTE

  useEffect(() => {
    // Respeita preferências do SO/navegador (e melhora performance).
    try {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
      const apply = () => setReduceMotion(Boolean(mq.matches))
      apply()
      mq.addEventListener?.('change', apply)
      return () => mq.removeEventListener?.('change', apply)
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    const id = window.requestAnimationFrame(() => setMounted(true))
    return () => window.cancelAnimationFrame(id)
  }, [])

  const cx = size / 2
  const cy = size / 2
  const radius = size / 2 - strokeWidth - 18 // margem pros ícones
  const iconRadius = radius + strokeWidth / 2 + 16
  const circumference = 2 * Math.PI * radius

  const normalized = useMemo(() => {
    const valid = (data?.categorias || []).filter((c) => Number.isFinite(c.valor) && c.valor > 0)
    const sumCategorias = valid.reduce((sum, c) => sum + c.valor, 0)
    const total = Number.isFinite(data?.total) && data.total > 0 ? data.total : sumCategorias

    const gapLen = (gapDegrees / 360) * circumference
    const items = valid.map((c, idx) => {
      const raw = total > 0 ? (c.valor / total) * circumference : 0
      const segLen = clamp(raw - gapLen, 0, circumference)
      return {
        ...c,
        color: c.color || defaultColorForCategory(c.nome) || paletteStable[idx % paletteStable.length],
        icon: c.icon || defaultIconForCategory(c.nome),
        segLen,
      }
    })

    let acc = 0
    const segments = items.map((c, idx) => {
      const startLen = acc
      acc += c.segLen + gapLen
      const startAngle = (startLen / circumference) * 360
      const sweepAngle = (c.segLen / circumference) * 360
      const midAngle = startAngle + sweepAngle / 2
      return { ...c, idx, startLen, midAngle }
    })

    return { total, segments }
  }, [data, circumference, gapDegrees, paletteStable])

  const centerText = variant === 'dark' ? 'text-white' : 'text-gray-900'
  const centerSubText = variant === 'dark' ? 'text-white/85' : 'text-gray-600'
  const trackStroke = variant === 'dark' ? 'rgba(255,255,255,0.18)' : 'rgba(15,23,42,0.10)'

  const iconPositions = useMemo(() => {
    // Anti-colisão simples:
    // - garante um espaçamento mínimo entre ícones ao redor do círculo
    // - se ficar “apertado” (muitas categorias), alterna entre 2 anéis (raios) para evitar sobreposição
    const segments = normalized.segments
    if (segments.length === 0) return []

    const normAngle = (a: number) => {
      const v = a % 360
      return v < 0 ? v + 360 : v
    }

    // Botões têm ~44-48px; no viewBox de 240, isso dá ~22-26 unidades de raio efetivo.
    // Aproximamos para calcular um espaçamento angular mínimo.
    const approxIconDiameter = 46
    const baseMinAngle = (approxIconDiameter / (2 * Math.PI * iconRadius)) * 360
    const minAngle = clamp(baseMinAngle, 12, 28)

    const useTwoRings = segments.length * minAngle > 330

    const placed = segments
      .map((s, idx) => ({ idx, angle: normAngle(s.midAngle), nome: s.nome, icon: s.icon! }))
      .sort((a, b) => a.angle - b.angle)

    // “Desenrola” ângulos para a frente garantindo minAngle entre vizinhos.
    for (let i = 1; i < placed.length; i++) {
      if (placed[i].angle - placed[i - 1].angle < minAngle) {
        placed[i].angle = placed[i - 1].angle + minAngle
      }
    }
    // Se estourou 360, shift geral para caber.
    const overflow = placed[placed.length - 1].angle - 360
    if (overflow > 0) {
      for (const p of placed) p.angle -= overflow
    }

    // Volta para a ordem original do segmento (pra manter estabilidade visual).
    const byIdx = new Map<number, { angle: number; ring: number; nome: string; icon: string }>()
    for (let i = 0; i < placed.length; i++) {
      const ring = useTwoRings ? (i % 2) : 0
      byIdx.set(placed[i].idx, { angle: normAngle(placed[i].angle), ring, nome: placed[i].nome, icon: placed[i].icon })
    }

    return segments.map((s, idx) => {
      const p = byIdx.get(idx)!
      const r = iconRadius + p.ring * 22
      const rad = ((p.angle - 90) * Math.PI) / 180 // -90 => começa no topo
      const x = cx + Math.cos(rad) * r
      const y = cy + Math.sin(rad) * r
      return {
        nome: p.nome,
        icon: p.icon,
        leftPct: (x / size) * 100,
        topPct: (y / size) * 100,
      }
    })
  }, [normalized.segments, cx, cy, iconRadius, size])

  return (
    <div className="relative w-full max-w-[460px] mx-auto">
      <svg className="w-full h-auto select-none" viewBox={`0 0 ${size} ${size}`}>
        {/* trilho */}
        <circle cx={cx} cy={cy} r={radius} fill="none" stroke={trackStroke} strokeWidth={strokeWidth} />

        {/* segmentos */}
        <g transform={`rotate(-90 ${cx} ${cy})`}>
          {normalized.segments.map((s) => {
            const isSelected = selectedCategory ? s.nome === selectedCategory : false
            const dimOthers = Boolean(selectedCategory) && !isSelected
            const dasharray = reduceMotion
              ? `${s.segLen} ${circumference}`
              : mounted
                ? `${s.segLen} ${circumference}`
                : `0 ${circumference}`

            return (
              <circle
                key={s.nome}
                cx={cx}
                cy={cy}
                r={radius}
                fill="none"
                stroke={s.color}
                strokeWidth={isSelected ? strokeWidth + 2 : strokeWidth}
                strokeLinecap="round"
                strokeDasharray={dasharray}
                strokeDashoffset={-s.startLen}
                opacity={dimOthers ? 0.35 : isSelected ? 1 : 0.92}
                style={{
                  cursor: 'pointer',
                  // Performance:
                  // - Mantém animação “bonita” só no mount (stroke-dasharray, com delay)
                  // - Em seleção/desseleção: sem drop-shadow/filter (pesado em SVG) e sem delay na opacidade
                  transition: reduceMotion
                    ? 'none'
                    : `stroke-dasharray 900ms cubic-bezier(0.22, 1, 0.36, 1) ${140 + s.idx * 90}ms, opacity 140ms linear 0ms, stroke-width 140ms linear 0ms`,
                  // Browsers desenham um focus outline retangular em elementos SVG focáveis.
                  // Aqui removemos esse outline para evitar a “borda quadrada” ao clicar.
                  outline: 'none',
                }}
                role="button"
                tabIndex={0}
                aria-label={`Selecionar categoria ${s.nome}`}
                onClick={(e) => {
                  e.stopPropagation()
                  onSelectCategory?.(s.nome)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onSelectCategory?.(s.nome)
                  }
                }}
              />
            )
          })}
        </g>
      </svg>

      {/* ícones */}
      {iconPositions.map((p) => {
        const isSelected = selectedCategory ? p.nome === selectedCategory : false
        const dimOthers = Boolean(selectedCategory) && !isSelected
        return (
          <button
            key={p.nome}
            type="button"
            className={[
              'absolute grid place-items-center',
              'w-11 h-11 sm:w-12 sm:h-12',
              'rounded-full',
              // Blur é bonito, mas pode pesar em mobile. Mantemos leve/condicional.
              'supports-[backdrop-filter]:backdrop-blur-sm',
              'transition-all duration-200',
              'focus:outline-none',
              isSelected ? 'bg-white shadow-lg ring-1 ring-black/10' : 'bg-white/85 shadow-md',
              dimOthers ? 'opacity-50' : 'opacity-100',
            ].join(' ')}
            style={{ left: `${p.leftPct}%`, top: `${p.topPct}%`, transform: 'translate(-50%, -50%)' }}
            aria-label={`Selecionar categoria ${p.nome}`}
            onClick={(e) => {
              e.stopPropagation()
              onSelectCategory?.(p.nome)
            }}
          >
            <span className="text-xl leading-none" aria-hidden="true">
              {p.icon}
            </span>
          </button>
        )
      })}

      {/* centro */}
      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        <div className="pointer-events-auto text-center">
          <p className={`${centerSubText} text-sm sm:text-base font-medium`}>{centerTitle}</p>
          <p className={`${centerText} text-3xl sm:text-4xl font-bold tracking-tight mt-1`}>
            {formatBRL(centerValue ?? normalized.total)}
          </p>
          <button
            type="button"
            className={[
              'mt-4 inline-flex items-center justify-center',
              'px-5 py-2.5 rounded-full',
              'font-semibold text-sm',
              'shadow-md transition',
              variant === 'dark'
                ? 'bg-white/15 hover:bg-white/20 text-white ring-1 ring-white/25'
                : 'bg-gray-900 hover:bg-gray-800 text-white',
              'focus:outline-none',
            ].join(' ')}
            onClick={(e) => {
              e.stopPropagation()
              onViewTransactions?.()
            }}
            disabled={!onViewTransactions}
            style={{ minHeight: 44 }}
          >
            {viewTransactionsLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
