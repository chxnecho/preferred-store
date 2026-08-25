export function formatPrice(n) {
  return Number(n || 0).toFixed(2);
}

/** 格式化时间字符串 "2026-08-25 08:42:48" → 友好显示 */
export function formatTime(s) {
  return s || "-";
}
