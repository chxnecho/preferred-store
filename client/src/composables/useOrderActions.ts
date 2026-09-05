import { api } from "../api"
import { confirm } from "../confirm"
import { toast } from "../toast"
import type { Order } from "../../../shared/types"

/**
 * 订单操作（支付 / 取消 / 确认收货）复用逻辑
 * @param onChanged 操作成功后的刷新回调（如重新拉取列表）
 */
export function useOrderActions(onChanged?: () => void): {
  pay: (order: Order) => Promise<Order | null>
  cancel: (order: Order) => Promise<Order | null>
  confirmReceipt: (order: Order) => Promise<Order | null>
} {
  async function pay(order: Order): Promise<Order | null> {
    try {
      const data = await api.payOrder(order.id)
      toast("支付成功 🎉")
      onChanged?.()
      return data.order
    } catch (err) {
      toast((err as Error).message, "error")
      return null
    }
  }

  async function cancel(order: Order): Promise<Order | null> {
    const ok = await confirm(`确认取消订单 ${order.orderNo} 吗？`, {
      title: "取消订单",
      danger: true
    })
    if (!ok) return null
    try {
      const data = await api.cancelOrder(order.id)
      toast("订单已取消")
      onChanged?.()
      return data.order
    } catch (err) {
      toast((err as Error).message, "error")
      return null
    }
  }

  async function confirmReceipt(order: Order): Promise<Order | null> {
    try {
      const data = await api.confirmOrder(order.id)
      toast("已确认收货，感谢购买！")
      onChanged?.()
      return data.order
    } catch (err) {
      toast((err as Error).message, "error")
      return null
    }
  }

  return { pay, cancel, confirmReceipt }
}