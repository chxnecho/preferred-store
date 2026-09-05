import { create } from "zustand"

export type ToastType = "success" | "error"

interface ToastItem {
  id: number
  message: string
  type: ToastType
}

interface ToastState {
  toasts: ToastItem[]
  push: (message: string, type?: ToastType) => void
}

let seq = 0

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (message, type = "success") => {
    const item: ToastItem = { id: ++seq, message, type }
    set((s) => ({ toasts: [...s.toasts, item] }))
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== item.id) }))
    }, 2400)
  }
}))

/**
 * 全局提示
 * @param message 提示文案
 * @param type 类型
 */
export function toast(message: string, type: ToastType = "success"): void {
  useToastStore.getState().push(message, type)
}