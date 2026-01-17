'use client'

import { useEffect, useRef, useState } from 'react'

export function AnimatedTopoBackground({
  src = '/bg.svg',
  opacity = 0.22,
  motionScale = 1,
  speedScale = 1,
  linesOnly = false,
}: {
  /** Path served from /public */
  src?: string
  /** Visual intensity; does not change SVG colors, only alpha */
  opacity?: number
  /** Scales translate distance (1 = default subtle) */
  motionScale?: number
  /** Scales animation speed (1 = default). Values < 1 slow down, > 1 speed up */
  speedScale?: number
  /** When true, hides all non-line layers from the SVG and keeps background transparent */
  linesOnly?: boolean
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)

  const [prefersReducedMotion, setPrefersReducedMotion] = useState(true)

  // Client-safe reduced-motion detection (avoids SSR surprises).
  useEffect(() => {
    const mql = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (!mql) {
      setPrefersReducedMotion(false)
      return
    }
    const update = () => setPrefersReducedMotion(!!mql.matches)
    update()
    mql.addEventListener?.('change', update)
    return () => mql.removeEventListener?.('change', update)
  }, [])

  useEffect(() => {
    if (prefersReducedMotion) return

    let mounted = true

    async function init() {
      const container = containerRef.current
      if (!container) return

      // Fetch the ready-made SVG and inject it inline (no path/color changes here).
      const res = await fetch(src, { cache: 'force-cache' })
      if (!res.ok) return
      const svgText = await res.text()
      if (!mounted) return

      container.innerHTML = svgText
      const svg = container.querySelector('svg')
      if (!svg) return

      // Ensure it behaves like a background (CSS also reinforces this).
      svg.setAttribute('preserveAspectRatio', svg.getAttribute('preserveAspectRatio') || 'xMidYMid slice')

      // Prefer animating only the "organic lines" layer to avoid moving the grid/background.
      // In this SVG, the bright lines live under `g.cls-5` (screen blend mode).
      const lineGroups = Array.from(svg.querySelectorAll<SVGGElement>('g.cls-5'))
      if (lineGroups.length === 0) return

      if (linesOnly) {
        // Keep only the organic line groups (.cls-5) and hide everything else.
        // Important: we keep <defs> (styles) and we keep all ancestors needed so the groups stay visible.
        // We do NOT change any path data or colors; we only hide non-line layers.
        const keep = new Set<Element>()

        // Always keep defs/styles
        const defs = svg.querySelector('defs')
        if (defs) {
          keep.add(defs)
          defs.querySelectorAll('*').forEach((n) => keep.add(n))
        }

        for (const g of lineGroups) {
          // Keep the whole subtree of the line group (paths, etc)
          keep.add(g)
          g.querySelectorAll('*').forEach((n) => keep.add(n))

          // Keep the ancestor chain up to the svg root
          let p: Element | null = g
          while ((p = p.parentElement)) {
            keep.add(p)
            if (p === svg) break
          }
        }

        // Hide every element not in the keep set
        svg.querySelectorAll('*').forEach((el) => {
          if (!keep.has(el)) (el as HTMLElement).style.display = 'none'
        })
      }

      // SMIL-based translate animation (no distortion, extremely low overhead).
      // This is handled by the SVG engine and avoids per-frame JS mutation issues on some browsers.
      const ns = 'http://www.w3.org/2000/svg'

      const vb = svg.viewBox?.baseVal
      const rect = svg.getBoundingClientRect()
      // Estimate px->user-units. For preserveAspectRatio=slice this is approximate but good enough.
      const unitsPerPx = vb && rect.width ? vb.width / rect.width : 2

      for (let i = 0; i < lineGroups.length; i++) {
        const g = lineGroups[i]

        // Remove previous animations (to allow prop updates / hot reload safely).
        g.querySelectorAll('animateTransform[data-animated-topo="1"]').forEach((n) => n.remove())

        const dxPx = (2 + (i % 7) * 0.6) * motionScale // ~2–5.6px * scale
        const dyPx = (0.6 + (i % 5) * 0.25) * motionScale // ~0.6–1.6px * scale
        const dx = Math.round(dxPx * unitsPerPx * 100) / 100
        const dy = Math.round(dyPx * unitsPerPx * 100) / 100

        const baseDur = 18 + (i % 11) * 2.2 // ~18–42s
        const dur = Math.max(6, baseDur / Math.max(0.2, speedScale))
        const begin = -(Math.random() * dur) // de-sync phases

        const anim = document.createElementNS(ns, 'animateTransform')
        anim.setAttribute('data-animated-topo', '1')
        anim.setAttribute('attributeName', 'transform')
        anim.setAttribute('attributeType', 'XML')
        anim.setAttribute('type', 'translate')
        anim.setAttribute('additive', 'sum')
        anim.setAttribute('dur', `${dur}s`)
        anim.setAttribute('repeatCount', 'indefinite')
        anim.setAttribute('begin', `${begin}s`)
        anim.setAttribute('calcMode', 'spline')
        anim.setAttribute('keyTimes', '0;0.5;1')
        anim.setAttribute('keySplines', '0.42 0 0.58 1;0.42 0 0.58 1')
        anim.setAttribute('values', `0 0; ${dx} ${dy}; 0 0`)

        g.appendChild(anim)
      }

      // Pause when tab is not visible (battery/perf)
      const canControlPlayback =
        typeof (svg as any).pauseAnimations === 'function' &&
        typeof (svg as any).unpauseAnimations === 'function'

      const onVisibility = () => {
        // Avoid getting stuck paused on browsers that implement only one of the methods.
        if (!canControlPlayback) return
        if (document.hidden) (svg as any).pauseAnimations()
        else (svg as any).unpauseAnimations()
      }
      document.addEventListener('visibilitychange', onVisibility)
      onVisibility()

      return () => {
        document.removeEventListener('visibilitychange', onVisibility)
      }
    }

    let cleanupVisibility: void | (() => void)
    init()
      .then((c) => {
        cleanupVisibility = c as any
      })
      .catch(() => {
        // ignore background failures
      })

    return () => {
      mounted = false
      if (cleanupVisibility) cleanupVisibility()
    }
  }, [prefersReducedMotion, src, motionScale, speedScale, linesOnly])

  return (
    <div
      aria-hidden="true"
      className="animated-topo-bg"
      style={{ opacity }}
    >
      <div ref={containerRef} className="animated-topo-bg__inner" />
    </div>
  )
}

