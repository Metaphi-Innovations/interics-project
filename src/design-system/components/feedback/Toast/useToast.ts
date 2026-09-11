import { create } from 'zustand'

export type ToastVariant = 'success' | 'error' | 'warning' | 'info' | 'default'

export interface ToastAction {
  label: string
  onClick: () => void
}

export interface Toast {
  id: string
  title: string
  description?: string
  variant: ToastVariant
  duration?: number
  action?: ToastAction
}

interface ToastStore {
  toasts: Toast[]
  showToast: (toast: Omit<Toast, 'id'>) => void
  dismissToast: (id: string) => void
  dismissAll: () => void
  success: (title: string, description?: string) => void
  error: (title: string, description?: string) => void
  warning: (title: string, description?: string) => void
}

function createToastId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `toast-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

/** Ensure toast title/description are always renderable strings (never objects). */
function toToastText(value: unknown, fallback: string): string {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed || fallback
  }
  if (value != null && typeof value === 'object' && 'message' in value) {
    const message = (value as { message?: unknown }).message
    if (typeof message === 'string' && message.trim()) return message.trim()
  }
  if (value == null) return fallback
  return fallback
}

export const useToast = create<ToastStore>((set, get) => ({
  toasts: [],
  showToast: (toast) =>
    set((state) => ({
      toasts: [
        ...state.toasts,
        {
          ...toast,
          id: createToastId(),
          title: toToastText(toast.title, 'Notification'),
          description: (() => {
            if (toast.description === undefined) return undefined
            const text = toToastText(toast.description, '')
            return text || undefined
          })(),
          duration: toast.duration ?? 4000,
        },
      ],
    })),
  dismissToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    })),
  dismissAll: () => set({ toasts: [] }),
  success: (title, description) => {
    get().showToast({ title, description, variant: 'success' })
  },
  error: (title, description) => {
    get().showToast({ title, description, variant: 'error' })
  },
  warning: (title, description) => {
    get().showToast({ title, description, variant: 'warning' })
  },
}))
