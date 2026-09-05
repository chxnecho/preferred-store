import { useCallback, useEffect, useMemo, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { api } from "../api"
import { useOrderActions } from "../composables/useOrderActions"
import { usePageTitle } from "../hooks/usePageTitle"
import { toast } from "../toast"
import { formatPrice, formatTime } from "../utils"
import type { Order } from "../../../shared/types"
import "../styles/OrdersView.css"

const tabs = [
  { label: "全部", value: "" },
  { label: "待支付", value: "pending" },
  { label: "待收货", value: "paid" },
  { label: "已完成", value: "completed" },
  { label: "已取消", value: "cancelled" }
]
const pageSize = 10

export default function OrdersView() {
  usePageTitle("我的订单")
  const router = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const status = searchParams.get("status") || ""
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"))

  const [orders, setOrders] = useState<Order[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total])

  const load = useCallback(
    async (p = page) => {
      setLoading(true)
      try {
        const data = await api.orders({ status: status || undefined, page: p })
        setOrders(data.list)
        setTotal(data.total)
      } catch (err: unknown) {
        toast(err instanceof Error ? err.message : "加载失败", "error")
      } finally {
        setLoading(false)
      }
    },
    [status, page]
  )

  // 订单操作复用：成功后刷新列表
  const { pay, cancel, confirmReceipt } = useOrderActions(() => load())

  function switchTab(v: string) {
    const next = new URLSearchParams(searchParams)
    if (v) next.set("status", v)
    else next.delete("status")
    next.set("page", "1")
    setSearchParams(next)
  }

  function jumpPage(e: React.KeyboardEvent<HTMLInputElement>) {
    const p = parseInt(e.currentTarget.value)
    if (Number.isInteger(p) && p >= 1 && p <= totalPages && p !== page) {
      const next = new URLSearchParams(searchParams)
      next.set("page", String(p))
      setSearchParams(next)
    }
    e.currentTarget.value = ""
  }

  useEffect(() => {
    load()
  }, [load])

  return (
    <main className="container orders-page">
      <h2 className="section-title">📦 我的订单</h2>

      <div className="status-tabs">
        {tabs.map((t) => (
          <button key={t.value} className={status === t.value ? "active" : ""} onClick={() => switchTab(t.value)}>
            {t.label}
          </button>
        ))}
      </div>

      {loading && <p className="empty-tip">加载中...</p>}
      {!loading && orders.length === 0 && <p className="empty-tip">暂无相关订单</p>}

      {!loading && orders.length > 0 && (
        <div className="order-list">
          {orders.map((o) => (
            <div key={o.id} className="order-card">
              <div className="order-head">
                <span>订单号：{o.orderNo}</span>
                <span className={`order-status ${o.status}`}>{o.statusText}</span>
              </div>
              <div className="order-items">
                {o.items.slice(0, 4).map((it, idx) => (
                  <div key={idx} className="o-item" onClick={() => router(`/orders/${o.id}`)}>
                    <div className="o-img" style={{ background: it.bg }}>
                      {it.emoji}
                    </div>
                    <span className="o-name">{it.name}</span>
                    <span className="price">{formatPrice(it.price)}</span>
                    <span className="o-qty">× {it.qty}</span>
                  </div>
                ))}
                {o.items.length > 4 && <p className="more-items">等 {o.items.length} 件商品...</p>}
              </div>
              <div className="order-foot">
                <span>{formatTime(o.createdAt)}</span>
                <div className="foot-right">
                  <span>
                    合计：<b className="price">{formatPrice(o.total)}</b>
                  </span>
                  {o.status === "pending" && (
                    <button className="btn-primary small" onClick={() => pay(o)}>
                      去支付
                    </button>
                  )}
                  {o.status === "pending" && (
                    <button className="btn-outline small" onClick={() => cancel(o)}>
                      取消订单
                    </button>
                  )}
                  {o.status === "paid" && (
                    <button className="btn-outline small" onClick={() => confirmReceipt(o)}>
                      确认收货
                    </button>
                  )}
                  <button className="btn-outline small" onClick={() => router(`/orders/${o.id}`)}>
                    查看详情
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="pagination">
          <button disabled={page <= 1} onClick={() => load(page - 1)}>
            ‹ 上一页
          </button>
          <span>
            第 {page} / {totalPages} 页
          </span>
          <button disabled={page >= totalPages} onClick={() => load(page + 1)}>
            下一页 ›
          </button>
          <label className="page-jump">
            跳至
            <input type="number" min={1} max={totalPages} aria-label="跳转到指定页" onKeyDown={jumpPage} />
            页
          </label>
        </div>
      )}
    </main>
  )
}
