export function formatPrice(n) {
  return Number(n || 0).toFixed(2);
}

/** 校验登录后跳转地址：只允许站内绝对路径，防止开放跳转 */
export function safeRedirectPath(p) {
  const s = String(p || "");
  return s.startsWith("/") && !s.startsWith("//") ? s : "/";
}

/** 格式化时间字符串 "2026-08-25 08:42:48" → 友好显示 */
export function formatTime(s) {
  return s || "-";
}
