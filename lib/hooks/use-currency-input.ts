'use client'

import { useState, useCallback, useRef, useEffect } from 'react'

/**
 * Formata um número para exibição (com pontos e vírgula)
 * Função auxiliar para ser usada na inicialização
 */
function formatCurrencyDisplayHelper(value: number): string {
  if (isNaN(value) || value === 0) return ''
  
  // Converte para string e garante 2 casas decimais
  const fixed = value.toFixed(2)
  
  // Separa parte inteira e decimal
  const [integer, decimal] = fixed.split('.')
  
  // Adiciona pontos para milhares
  const integerWithDots = integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  
  return `${integerWithDots},${decimal}`
}

/**
 * Hook para formatação de valores monetários com máscara brasileira
 * Formata automaticamente: 1000 -> "1.000,00"
 */
export function useCurrencyInput(initialValue: number | string = '') {
  const [displayValue, setDisplayValue] = useState<string>(() => {
    if (!initialValue) return ''
    const num = typeof initialValue === 'string' ? parseFloat(initialValue) : initialValue
    return formatCurrencyDisplayHelper(num)
  })

  const inputRef = useRef<HTMLInputElement>(null)

  /**
   * Formata um número para exibição (com pontos e vírgula)
   */
  const formatCurrencyDisplay = useCallback((value: number): string => {
    return formatCurrencyDisplayHelper(value)
  }, [])

  /**
   * Remove formatação e retorna número puro
   */
  const parseCurrencyValue = useCallback((value: string): number => {
    // Remove tudo exceto dígitos e vírgula
    const cleaned = value.replace(/[^\d,]/g, '')
    
    // Substitui vírgula por ponto
    const normalized = cleaned.replace(',', '.')
    
    const parsed = parseFloat(normalized)
    return isNaN(parsed) ? 0 : parsed
  }, [])

  /**
   * Atualiza valor quando o usuário digita
   */
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value
    const cursorPosition = e.target.selectionStart || 0

    // Remove caracteres não numéricos (exceto vírgula)
    let cleaned = inputValue.replace(/[^\d,]/g, '')
    
    // Permite apenas uma vírgula
    const commaIndex = cleaned.indexOf(',')
    if (commaIndex !== -1) {
      const beforeComma = cleaned.substring(0, commaIndex)
      const afterComma = cleaned.substring(commaIndex + 1).replace(/\D/g, '').substring(0, 2)
      cleaned = beforeComma + ',' + afterComma
    } else {
      // Sem vírgula, apenas dígitos
      cleaned = cleaned.replace(/\D/g, '')
    }

    // Converte para número e formata
    if (cleaned === '' || cleaned === ',') {
      setDisplayValue('')
      return
    }

    const numValue = parseCurrencyValue(cleaned)
    const formatted = formatCurrencyDisplay(numValue)
    
    setDisplayValue(formatted)

    // Mantém cursor na posição correta após formatação
    requestAnimationFrame(() => {
      if (inputRef.current && formatted !== displayValue) {
        // Calcula quantos dígitos havia antes do cursor
        const beforeCursor = inputValue.substring(0, cursorPosition)
        const digitsBeforeCursor = beforeCursor.replace(/\D/g, '').length
        
        // Encontra a posição no texto formatado que corresponde aos mesmos dígitos
        let digitCount = 0
        let newPosition = formatted.length
        
        for (let i = 0; i < formatted.length; i++) {
          if (/\d/.test(formatted[i])) {
            digitCount++
            if (digitCount === digitsBeforeCursor) {
              newPosition = i + 1
              break
            }
          }
        }
        
        newPosition = Math.max(0, Math.min(newPosition, formatted.length))
        inputRef.current.setSelectionRange(newPosition, newPosition)
      }
    })
  }, [formatCurrencyDisplay, parseCurrencyValue])

  /**
   * Retorna o valor numérico (para salvar no banco)
   */
  const getNumericValue = useCallback((): number => {
    return parseCurrencyValue(displayValue)
  }, [displayValue, parseCurrencyValue])

  /**
   * Define valor externamente (para carregar dados existentes)
   */
  const setValue = useCallback((value: number | string) => {
    const num = typeof value === 'string' ? parseFloat(value) : value
    if (!isNaN(num) && num > 0) {
      setDisplayValue(formatCurrencyDisplay(num))
    } else if (num === 0) {
      setDisplayValue('')
    } else {
      setDisplayValue('')
    }
  }, [formatCurrencyDisplay])

  /**
   * Limpa o valor
   */
  const clearValue = useCallback(() => {
    setDisplayValue('')
  }, [])

  return {
    displayValue,
    handleChange,
    getNumericValue,
    setValue,
    clearValue,
    inputRef,
  }
}
