import { create } from "zustand"

let seq = 0

export const useToastStore = create((set) => ({
  toasts: [],
  push: (message, type = "success") => {
    const item = { id: ++seq, message, type }
    set((s) => ({ toasts: [...s.toasts, item] }))
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== item.id) }))
    }, 2400)
  }
}))

/**
 * 全局提示
 * @param {string} message 提示文案
 * @param {"success"|"error"} type 类型
 */
export function toast(message, type = "success") {
  useToastStore.getState().push(message, type)
}
