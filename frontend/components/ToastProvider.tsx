'use client'

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import Toast from './Toast'

type ToastVariant = 'success' | 'error' | 'info' | 'destructive'

interface ToastOptions {
  title: string
  description?: string
  variant?: ToastVariant
}

interface ToastItem extends ToastOptions {
  id: string
}

interface ToastContextValue {
  toast: (options: ToastOptions) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const toast = useCallback((options: ToastOptions) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    setToasts((prev) => [...prev, { ...options, id }])
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const value = useMemo(() => ({ toast }), [toast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3">
        {toasts.map((toastItem) => (
          <Toast
            key={toastItem.id}
            message={toastItem.description ? `${toastItem.title}: ${toastItem.description}` : toastItem.title}
            type={toastItem.variant === 'destructive' ? 'error' : toastItem.variant || 'info'}
            duration={5000}
            onClose={() => removeToast(toastItem.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToastContext() {
  const context = useContext(ToastContext)
  if (!context) {
    return {
      toast: ({ title, description, variant }: ToastOptions) => {
        // Fallback in case provider is missing.
        if (typeof window !== 'undefined') {
          window.alert(`${title}${description ? `\n${description}` : ''}`)
        }
        console.log(`[toast:${variant ?? 'info'}] ${title} ${description ?? ''}`)
      },
    }
  }
  return context
}
