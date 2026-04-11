import { useState, useCallback, useEffect } from 'react'

export interface Toast {
  id: string
  title?: string
  description?: string
  variant?: 'default' | 'destructive'
  duration?: number
}

interface ToastState {
  toasts: Toast[]
}

const toastState: ToastState = {
  toasts: []
}

const listeners: Array<(state: ToastState) => void> = []

function dispatch(action: { type: string; toast?: Toast; id?: string }) {
  switch (action.type) {
    case 'ADD_TOAST':
      if (action.toast) {
        toastState.toasts = [...toastState.toasts, action.toast]
      }
      break
    case 'REMOVE_TOAST':
      if (action.id) {
        toastState.toasts = toastState.toasts.filter(t => t.id !== action.id)
      }
      break
    case 'DISMISS_TOAST':
      if (action.id) {
        toastState.toasts = toastState.toasts.map(t =>
          t.id === action.id ? { ...t, open: false } : t
        )
      }
      break
  }

  listeners.forEach(listener => listener(toastState))
}

let count = 0

function genId() {
  count = (count + 1) % Number.MAX_VALUE
  return count.toString()
}

export function useToast() {
  const [state, setState] = useState<ToastState>(toastState)

  const subscribe = useCallback((listener: (state: ToastState) => void) => {
    listeners.push(listener)
    return () => {
      const index = listeners.indexOf(listener)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [])

  const toast = useCallback(
    ({ ...props }: Omit<Toast, 'id'>) => {
      const id = genId()

      const update = (props: Partial<Toast>) =>
        dispatch({
          type: 'UPDATE_TOAST',
          toast: { ...props, id }
        })

      const dismiss = () => dispatch({ type: 'DISMISS_TOAST', id })

      dispatch({
        type: 'ADD_TOAST',
        toast: {
          ...props,
          id,
          open: true,
          onOpenChange: (open: boolean) => {
            if (!open) dismiss()
          }
        } as Toast
      })

      // Auto dismiss after duration
      if (props.duration !== Infinity) {
        setTimeout(() => {
          dismiss()
        }, props.duration || 5000)
      }

      return {
        id,
        dismiss,
        update
      }
    },
    []
  )

  // Subscribe to state changes
  useEffect(() => {
    const unsubscribe = subscribe(setState)
    return unsubscribe
  }, [subscribe])

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: 'REMOVE_TOAST', id: toastId })
  }
}