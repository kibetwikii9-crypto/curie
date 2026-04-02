'use client'

import { useCallback } from 'react'

type ToastVariant = 'success' | 'error' | 'info' | 'destructive'

interface ToastOptions {
  title: string
  description?: string
  variant?: ToastVariant
}

export function useToast() {
  const toast = useCallback(({ title, description, variant }: ToastOptions) => {
    // Fallback toast implementation for missing global toast system.
    // This will not conflict with existing code and provides a safe no-op UI.
    console.log(`[toast:${variant ?? 'info'}] ${title} ${description ?? ''}`)
  }, [])

  return { toast }
}
