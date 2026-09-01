export function formatPrice(n) {
  return Number(n || 0).toFixed(2)
}

/** 校验登录后跳转地址：只允许站内绝对路径，防止开放跳转 */
export function safeRedirectPath(p) {
  const s = String(p || "")
  return s.startsWith("/") && !s.startsWith("//") ? s : "/"
}

/** 服务端 UTC 时间 "YYYY-MM-DD HH:MM:SS" → 本地时区友好显示 */
export function formatTime(s) {
  if (!s) return "-"
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/.exec(String(s))
  if (!m) return s
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]))
  if (Number.isNaN(d.getTime())) return s
  const p = (n) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}
