import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useCartStore } from "../stores/cart"
import { usePageTitle } from "../hooks/usePageTitle"
import { toast } from "../toast"
import { formatPrice } from "../utils"
import "../styles/cart.css"

export default function CartView() {
  usePageTitle("购物车")
  const router = useNavigate()
  const cart = useCartStore()
  const [selected, setSelected] = useState(() => new Set())
  const [busy, setBusy] = useState(false)

  const selectedItems = useMemo(() => cart.items.filter((i) => selected.has(i.productId)), [cart.items, selected])
  const selectedQty = useMemo(() => selectedItems.reduce((s, i) => s + i.qty, 0), [selectedItems])
  const selectedTotal = useMemo(
    () => Math.round(selectedItems.reduce((s, i) => s + i.price * i.qty * 100, 0)) / 100,
    [selectedItems]
  )
  const allSelected = useMemo(
    () => cart.items.length > 0 && cart.items.every((i) => selected.has(i.productId)),
    [cart.items, selected]
  )

  // 拉取购物车后同步勾选状态：移除已不存在的商品，空则默认全选
  function syncSelection() {
    const ids = new Set(useCartStore.getState().items.map((i) => i.productId))
    setSelected((prev) => {
      const next = new Set([...prev].filter((id) => ids.has(id)))
      if (next.size === 0) for (const id of ids) next.add(id)
      return next
    })
  }

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    setSelected(() => {
      const next = new Set()
      if (!allSelected) for (const i of cart.items) next.add(i.productId)
      return next
    })
  }

  async function changeQty(productId, qty) {
    if (qty <= 0) return removeItem(productId)
    setBusy(true)
    try {
      await cart.updateQty(productId, qty)
      syncSelection()
    } catch (err) {
      toast(err.message, "error")
      await cart.fetchCart()
      syncSelection()
    } finally {
      setBusy(false)
    }
  }

  async function removeItem(productId) {
    setBusy(true)
    try {
      await cart.remove(productId)
      toast("已删除")
    } catch (err) {
      toast(err.message, "error")
    } finally {
      setBusy(false)
    }
  }

  function goCheckout() {
    // 售罄（qty 已被置 0）的商品不进入结算
    const ids = selectedItems.filter((i) => i.qty > 0).map((i) => i.productId)
    router(`/checkout?ids=${ids.join(",")}`)
  }

  useEffect(() => {
    cart.fetchCart().then(syncSelection).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <main className="container cart-page">
      <h2 className="section-title">🛒 我的购物车</h2>

      {cart.totalQty === 0 ? (
        <p className="empty-tip">
          购物车还是空的，快去
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault()
              router("/products")
            }}
          >
            逛逛
          </a>
          吧～
        </p>
      ) : (
        <>
          <div className="cart-list">
            {cart.items.map((item) => (
              <div key={item.productId} className="cart-row">
                <input
                  type="checkbox"
                  checked={selected.has(item.productId)}
                  onChange={() => toggle(item.productId)}
                />
                <div
                  className="row-img"
                  style={{ background: item.bg }}
                  onClick={() => router(`/product/${item.productId}`)}
                >
                  {item.emoji}
                </div>
                <div className="row-info">
                  <div className="row-name">
                    {item.name}
                    {item.soldOut ? (
                      <em className="stock-badge soldout">已售罄</em>
                    ) : item.stockShortage ? (
                      <em className="stock-badge shortage">库存不足，仅剩 {item.stock} 件</em>
                    ) : null}
                  </div>
                  <div className="row-desc">{item.description}</div>
                </div>
                <span className="price row-price">{formatPrice(item.price)}</span>
                <div className="qty-control">
                  <button disabled={busy} onClick={() => changeQty(item.productId, item.qty - 1)}>
                    −
                  </button>
                  <span className="qty">{item.qty}</span>
                  <button
                    disabled={busy || item.qty >= item.stock}
                    title={item.qty >= item.stock ? "已达库存上限" : ""}
                    onClick={() => changeQty(item.productId, item.qty + 1)}
                  >
                    ＋
                  </button>
                </div>
                <span className="price row-subtotal">{formatPrice(item.price * item.qty)}</span>
                <button className="remove-btn" onClick={() => removeItem(item.productId)}>
                  🗑️ 删除
                </button>
              </div>
            ))}
          </div>

          <div className="cart-summary">
            <label className="select-all">
              <input type="checkbox" checked={allSelected} onChange={toggleAll} /> 全选
            </label>
            <div className="summary-right">
              <span>
                已选 <b>{selectedQty}</b> 件，合计：
              </span>
              <strong className="price big">{formatPrice(selectedTotal)}</strong>
              <button className="btn-primary" disabled={selectedQty === 0 || busy} onClick={goCheckout}>
                去结算（{selectedQty}）
              </button>
            </div>
          </div>
        </>
      )}
    </main>
  )
}
