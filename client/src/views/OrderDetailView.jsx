import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { api } from "../api"
import { useOrderActions } from "../composables/useOrderActions"
import { usePageTitle } from "../hooks/usePageTitle"
import { toast } from "../toast"
import { formatPrice, formatTime } from "../utils"
import "../styles/OrderDetailView.css"

export default function OrderDetailView() {
  usePageTitle("订单详情")
  const { id } = useParams()
  const router = useNavigate()
  const actions = useOrderActions()

  const [order, setCurrent] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
    api
      .order(id)
      .then((data) => {
        if (!active) return
        setCurrent(data.order)
        document.title = `订单 ${data.order.orderNo} - 优选商城`
      })
      .catch((err) => {
        if (!active) return
        setCurrent(null)
        toast(err.message, "error")
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [id])

  async function pay() {
    const updated = await actions.pay(order)
    if (updated) setCurrent(updated)
  }

  async function cancel() {
    const updated = await actions.cancel(order)
    if (updated) setCurrent(updated)
  }

  async function confirmReceipt() {
    const updated = await actions.confirmReceipt(order)
    if (updated) setCurrent(updated)
  }

  return (
    <main className="container order-detail-page">
      {loading && <p className="empty-tip">加载中...</p>}
      {!loading && !order && <p className="empty-tip">订单不存在</p>}
      {!loading && order && (
        <>
          {/* 状态卡片 */}
          <section className={`status-card ${order.status}`}>
            <div>
              <h2>{order.statusText}</h2>
              {order.status === "pending" && <p>请在下单后尽快完成支付</p>}
              {order.status === "paid" && <p>商家正在备货，请耐心等待</p>}
              {order.status === "completed" && <p>交易完成，感谢您的购买！</p>}
              {order.status === "cancelled" && <p>该订单已取消</p>}
            </div>
            <div className="status-actions">
              {order.status === "pending" && (
                <button className="btn-primary" onClick={pay}>
                  立即支付（模拟）
                </button>
              )}
              {order.status === "pending" && (
                <button className="btn-outline" onClick={cancel}>
                  取消订单
                </button>
              )}
              {order.status === "paid" && (
                <button className="btn-primary" onClick={confirmReceipt}>
                  确认收货
                </button>
              )}
            </div>
          </section>

          {/* 收货信息 */}
          <section className="panel">
            <h3>收货信息</h3>
            <div className="addr-line">
              <b>{order.address.receiver}</b> {order.address.phone}
            </div>
            <div className="addr-line sub">
              {order.address.region} {order.address.detail}
            </div>
          </section>

          {/* 商品清单 */}
          <section className="panel">
            <h3>商品清单</h3>
            {order.items.map((it, idx) => (
              <div key={idx} className="item-row" onClick={() => router(`/product/${it.productId}`)}>
                <div className="item-img" style={{ background: it.bg }}>
                  {it.emoji}
                </div>
                <span className="item-name">{it.name}</span>
                <span className="price">{formatPrice(it.price)}</span>
                <span className="item-qty">× {it.qty}</span>
                <span className="price item-sub">{formatPrice(it.price * it.qty)}</span>
              </div>
            ))}
            <div className="total-row">
              <span>
                订单编号：{order.orderNo} · 下单时间：{formatTime(order.createdAt)}
              </span>
              <span>
                实付款：<b className="price big">{formatPrice(order.total)}</b>
              </span>
            </div>
          </section>
        </>
      )}
    </main>
  )
}
