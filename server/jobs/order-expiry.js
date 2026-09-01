// 待支付订单超时自动取消：回补库存与销量，防止库存被无限期占用
import { db, withTransaction } from "../db.js"

const CHECK_INTERVAL_MS = 60 * 1000

/** 取消所有已过期待支付订单，返回取消数量 */
export function cancelExpiredOrders() {
  try {
    const cancelled = withTransaction(() => {
      const expired = db
        .prepare(
          "SELECT id FROM orders WHERE status = 'pending' AND expire_at IS NOT NULL AND expire_at <= datetime('now')"
        )
        .all()
      if (expired.length === 0) return 0

      const itemsStmt = db.prepare("SELECT product_id, qty FROM order_items WHERE order_id = ?")
      const restoreStmt = db.prepare(
        "UPDATE products SET stock = stock + ?, sales = MAX(sales - ?, 0) WHERE id = ?"
      )
      const cancelStmt = db.prepare(
        "UPDATE orders SET status = 'cancelled' WHERE id = ? AND status = 'pending'"
      )
      for (const { id } of expired) {
        for (const it of itemsStmt.all(id)) {
          restoreStmt.run(it.qty, it.qty, it.product_id)
        }
        cancelStmt.run(id)
      }
      return expired.length
    })
    if (cancelled > 0)
      console.log(`[order-expiry] 已自动取消 ${cancelled} 个超时未支付订单并回补库存`)
    return cancelled
  } catch (err) {
    console.error("[order-expiry] 取消超时订单失败", err)
    return 0
  }
}

/** 启动定时清理任务（启动时先执行一次） */
export function startOrderExpiryJob() {
  cancelExpiredOrders()
  return setInterval(cancelExpiredOrders, CHECK_INTERVAL_MS)
}
