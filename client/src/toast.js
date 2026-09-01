import { reactive } from "vue"

export const toasts = reactive([])
let seq = 0

/**
 * 全局提示
 * @param {string} message 提示文案
 * @param {"success"|"error"} type 类型
 */
export function toast(message, type = "success") {
  const item = { id: ++seq, message, type }
  toasts.push(item)
  setTimeout(() => {
    const i = toasts.indexOf(item)
    if (i > -1) toasts.splice(i, 1)
  }, 2400)
}
