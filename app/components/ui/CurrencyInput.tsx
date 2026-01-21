'use client'

import React from 'react'
import { useCurrencyInput } from '@/lib/hooks/use-currency-input'

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  value?: number | string
  onChange?: (value: number) => void
  label?: string
  required?: boolean
}

/**
 * Componente de input para valores monetários com máscara brasileira
 * Formata automaticamente: 1000 -> "1.000,00"
 */
export function CurrencyInput({
  value,
  onChange,
  label,
  required,
  className = '',
  id,
  name,
  placeholder = '0,00',
  ...props
}: CurrencyInputProps) {
  const {
    displayValue,
    handleChange: handleCurrencyChange,
    getNumericValue,
    setValue,
    inputRef,
  } = useCurrencyInput(value || '')

  // Controla quando sincronizar valor externo (evita conflito durante digitação)
  const isUserTypingRef = React.useRef(false)
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null)

  React.useEffect(() => {
    // Ignora sincronização se o usuário está digitando
    if (isUserTypingRef.current) {
      return
    }

    // Sincroniza apenas quando valor muda externamente
    const newNumeric = typeof value === 'string' ? parseFloat(value) : (value || 0)
    const currentNumeric = getNumericValue()
    
    // Só atualiza se houver diferença significativa (não é o mesmo valor que está no input)
    if (!isNaN(newNumeric)) {
      if (Math.abs(currentNumeric - newNumeric) > 0.01) {
        setValue(newNumeric)
      }
    } else if (value === '' || value === 0 || value === '0') {
      if (currentNumeric > 0) {
        setValue(0)
      }
    }
  }, [value, setValue, getNumericValue])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Marca que usuário está digitando
    isUserTypingRef.current = true
    
    // Limpa timeout anterior
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    
    // Captura o valor antes de processar
    const inputValue = e.target.value
    const cleaned = inputValue.replace(/[^\d,]/g, '')
    
    // Calcula o valor numérico diretamente do input
    let numericValue = 0
    const commaIndex = cleaned.indexOf(',')
    
    if (commaIndex !== -1) {
      // Tem vírgula: trata como decimal
      const beforeComma = cleaned.substring(0, commaIndex)
      const afterComma = cleaned.substring(commaIndex + 1).replace(/\D/g, '').substring(0, 2)
      const normalized = beforeComma + '.' + afterComma
      numericValue = parseFloat(normalized) || 0
    } else {
      // Sem vírgula: trata como valor inteiro
      numericValue = parseFloat(cleaned) || 0
    }
    
    // Chama onChange com o valor calculado imediatamente
    onChange?.(numericValue)
    
    // Depois processa a formatação
    handleCurrencyChange(e)
    
    // Permite sincronização após usuário parar de digitar
    timeoutRef.current = setTimeout(() => {
      isUserTypingRef.current = false
    }, 300)
  }

  // Cleanup timeout
  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const inputId = id || name || `currency-input-${Math.random().toString(36).substr(2, 9)}`

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          {...props}
          ref={inputRef}
          type="text"
          inputMode="decimal"
          id={inputId}
          name={name}
          value={displayValue}
          onChange={handleChange}
          placeholder={placeholder}
          className={`
            w-full px-4 py-2.5 border border-gray-300 rounded-lg
            focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500
            transition-colors
            ${className}
          `}
        />
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
          <span className="text-gray-400 text-sm">R$</span>
        </div>
      </div>
    </div>
  )
}
