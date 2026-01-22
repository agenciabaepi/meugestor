'use client'

import { Moon, Sun, Monitor, ChevronDown, Check } from 'lucide-react'
import { useTheme } from './ThemeProvider'
import { useState, useRef, useEffect } from 'react'

export function ThemeToggle() {
  const { theme, setTheme, mounted } = useTheme()
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Fecha o menu ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

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

  const options = [
    { value: 'light' as const, label: 'Modo claro', icon: Sun },
    { value: 'dark' as const, label: 'Modo escuro', icon: Moon },
    { value: 'system' as const, label: 'Seguir sistema', icon: Monitor },
  ]

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="
          flex items-center gap-2 px-3 py-2 rounded-lg
          text-gray-600 dark:text-gray-300
          hover:bg-gray-100 dark:hover:bg-gray-800
          transition-colors
          focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900
        "
        aria-label={getLabel()}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {getIcon()}
        <span className="hidden sm:inline text-sm font-medium">{getLabel()}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="
          absolute right-0 mt-2 w-48
          bg-white dark:bg-gray-800
          rounded-lg shadow-lg
          border border-gray-200 dark:border-gray-700
          py-1 z-50
        ">
          {options.map((option) => {
            const Icon = option.icon
            const isSelected = theme === option.value
            
            return (
              <button
                key={option.value}
                onClick={() => {
                  setTheme(option.value)
                  setIsOpen(false)
                }}
                className="
                  w-full flex items-center gap-3 px-4 py-2.5
                  text-sm text-gray-700 dark:text-gray-300
                  hover:bg-gray-100 dark:hover:bg-gray-700
                  transition-colors
                  focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-700
                "
              >
                <Icon className="w-4 h-4" />
                <span className="flex-1 text-left">{option.label}</span>
                {isSelected && (
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
