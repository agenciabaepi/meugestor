'use client'

import { useEffect } from 'react'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: string
  type: ToastType
  title: string
  description?: string
  duration?: number
}

interface ToastProps {
  toast: Toast
  onClose: (id: string) => void
}

const toastConfig = {
  success: {
    icon: CheckCircle,
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    iconColor: 'text-emerald-600',
    titleColor: 'text-emerald-900',
    textColor: 'text-emerald-700',
  },
  error: {
    icon: AlertCircle,
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    iconColor: 'text-red-600',
    titleColor: 'text-red-900',
    textColor: 'text-red-700',
  },
  warning: {
    icon: AlertTriangle,
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    iconColor: 'text-amber-600',
    titleColor: 'text-amber-900',
    textColor: 'text-amber-700',
  },
  info: {
    icon: Info,
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    iconColor: 'text-blue-600',
    titleColor: 'text-blue-900',
    textColor: 'text-blue-700',
  },
}

export function ToastItem({ toast, onClose }: ToastProps) {
  const config = toastConfig[toast.type]
  const Icon = config.icon
  const duration = toast.duration ?? 5000

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose(toast.id)
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [duration, toast.id, onClose])

  return (
    <div
      className={`
        relative flex items-start gap-3 p-4 rounded-lg shadow-lg
        ${config.bgColor} ${config.borderColor} border
        min-w-[320px] max-w-md
        transform transition-all duration-300 ease-out
        animate-in slide-in-from-right-full
      `}
      role="alert"
      aria-live="polite"
    >
      <Icon className={`w-5 h-5 ${config.iconColor} shrink-0 mt-0.5`} />
      <div className="flex-1 min-w-0">
        <p className={`font-semibold text-sm ${config.titleColor} mb-0.5`}>
          {toast.title}
        </p>
        {toast.description && (
          <p className={`text-sm ${config.textColor}`}>
            {toast.description}
          </p>
        )}
      </div>
      <button
        onClick={() => onClose(toast.id)}
        className={`
          p-1 rounded-md
          ${config.textColor} hover:opacity-70
          transition-opacity
          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500
          shrink-0
        `}
        aria-label="Fechar notificação"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
