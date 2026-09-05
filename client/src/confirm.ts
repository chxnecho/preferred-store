import { create } from "zustand"

export interface ConfirmOptions {
  title?: string
  danger?: boolean
}

interface ConfirmState {
  visible: boolean
  title: string
  message: string
  danger: boolean
  resolve: ((result: boolean) => void) | null
  open: (message: string, opts: ConfirmOptions, resolve: (result: boolean) => void) => void
  settle: (result: boolean) => void
}

/**
 * 全局确认弹窗（由 App 挂载的 ConfirmDialog 组件渲染），Promise 化替代 window.confirm
 */
export const useConfirmStore = create<ConfirmState>((set) => ({
  visible: false,
  title: "确认操作",
  message: "",
  danger: false,
  resolve: null,
  open: (message, { title = "确认操作", danger = false } = {}, resolve) =>
    set({ visible: true, title, message, danger, resolve }),
  settle: (result) => {
    const { resolve } = useConfirmStore.getState()
    set({ visible: false, resolve: null })
    resolve?.(result)
  }
}))

/**
 * Promise 化确认弹窗
 * @returns 用户点击"确认"返回 true，"取消"返回 false
 */
export function confirm(message: string, opts: ConfirmOptions = {}): Promise<boolean> {
  return new Promise((resolve) => {
    useConfirmStore.getState().open(message, opts, resolve)
  })
}