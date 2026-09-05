/** 格式化价格（金额以元为单位，API 已从整数分转换） */
export function formatPrice(n: number | string | null | undefined): string {
  return Number(n || 0).toFixed(2)
}

/** 格式化销量：过万显示 x.x万 */
export function formatSales(n: number | string | null | undefined): string {
  const s = Number(n || 0)
  return s >= 10000 ? `已售 ${(s / 10000).toFixed(1)}万` : `已售 ${s}`
}

/** 校验登录后跳转地址：只允许站内绝对路径，防止开放跳转 */
export function safeRedirectPath(p: string | null | undefined): string {
  const s = String(p || "")
  return s.startsWith("/") && !s.startsWith("//") ? s : "/"
}

/** 服务端 UTC 时间 "YYYY-MM-DD HH:MM:SS" → 本地时区友好显示 */
export function formatTime(s: string | null | undefined): string {
  if (!s) return "-"
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/.exec(String(s))
  if (!m) return s
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]))
  if (Number.isNaN(d.getTime())) return s
  const p = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}