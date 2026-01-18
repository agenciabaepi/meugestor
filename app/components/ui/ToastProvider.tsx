'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { Toast, ToastType } from './Toast'
import { ToastItem } from './Toast'

interface ToastContextType {
  toast: (toast: Omit<Toast, 'id'>) => void
  success: (title: string, description?: string, duration?: number) => void
  error: (title: string, description?: string, duration?: number) => void
  info: (title: string, description?: string, duration?: number) => void
  warning: (title: string, description?: string, duration?: number) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts((prev) => [...prev, { ...toast, id }])
  }, [])

  const success = useCallback(
    (title: string, description?: string, duration?: number) => {
      addToast({ type: 'success', title, description, duration })
    },
    [addToast]
  )

  const error = useCallback(
    (title: string, description?: string, duration?: number) => {
      addToast({ type: 'error', title, description, duration })
    },
    [addToast]
  )

  const info = useCallback(
    (title: string, description?: string, duration?: number) => {
      addToast({ type: 'info', title, description, duration })
    },
    [addToast]
  )

  const warning = useCallback(
    (title: string, description?: string, duration?: number) => {
      addToast({ type: 'warning', title, description, duration })
    },
    [addToast]
  )

  return (
    <ToastContext.Provider value={{ toast: addToast, success, error, info, warning }}>
      {children}
      {/* Toast Container */}
      <div
        className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none"
        aria-live="assertive"
        aria-atomic="true"
      >
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastItem toast={toast} onClose={removeToast} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}
