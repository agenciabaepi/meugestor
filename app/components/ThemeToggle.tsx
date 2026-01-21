'use client'

import { Moon, Sun, Monitor } from 'lucide-react'
import { useTheme } from './ThemeProvider'

export function ThemeToggle() {
  const { theme, setTheme, mounted } = useTheme()

  // Evita erro de hidratação - retorna botão estático até montar
  if (!mounted) {
    return (
      <button
        className="
          p-2 rounded-lg
          text-gray-600 dark:text-gray-300
          hover:bg-gray-100 dark:hover:bg-gray-800
          transition-colors
          focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900
          relative
        "
        aria-label="Carregando tema..."
        disabled
      >
        <Monitor className="w-5 h-5" />
      </button>
    )
  }

  const cycleTheme = () => {
    if (theme === 'light') {
      setTheme('dark')
    } else if (theme === 'dark') {
      setTheme('system')
    } else {
      setTheme('light')
    }
  }

  const getIcon = () => {
    if (theme === 'dark') {
      return <Moon className="w-5 h-5" />
    } else if (theme === 'system') {
      return <Monitor className="w-5 h-5" />
    } else {
      return <Sun className="w-5 h-5" />
    }
  }

  const getLabel = () => {
    if (theme === 'dark') {
      return 'Modo escuro'
    } else if (theme === 'system') {
      return 'Seguir sistema'
    } else {
      return 'Modo claro'
    }
  }

  return (
    <button
      onClick={cycleTheme}
      className="
        p-2 rounded-lg
        text-gray-600 dark:text-gray-300
        hover:bg-gray-100 dark:hover:bg-gray-800
        transition-colors
        focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900
        relative
      "
      aria-label={getLabel()}
      title={getLabel()}
    >
      {getIcon()}
    </button>
  )
}
