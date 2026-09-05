import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { api } from "../api"
import AddressForm from "../components/AddressForm"
import { useCartStore } from "../stores/cart"
import { usePageTitle } from "../hooks/usePageTitle"
import { toast } from "../toast"
import { formatPrice } from "../utils"
import "../styles/CheckoutView.css"

export default function CheckoutView() {
  usePageTitle("确认订单")
  const router = useNavigate()
  const [searchParams] = useSearchParams()
  const cart = useCartStore()

  const [addresses, setAddresses] = useState([])
  const [selectedAddressId, setSelectedAddressId] = useState(null)
  const [showAddrForm, setShowAddrForm] = useState(false)
  const [addrError, setAddrError] = useState("")
  const [addrSaving, setAddrSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // 结算商品：URL 带 ids 时按勾选过滤，否则用整个购物车
  const idsParam = searchParams.get("ids") || ""
  const idSet = useMemo(() => new Set(idsParam ? idsParam.split(",").map(Number) : []), [idsParam])
  const checkoutItems = useMemo(
    () => (idSet.size ? cart.items.filter((i) => idSet.has(i.productId)) : cart.items),
    [cart.items, idSet]
  )
  const totalQty = useMemo(() => checkoutItems.reduce((s, i) => s + i.qty, 0), [checkoutItems])
  const total = useMemo(
    () => Math.round(checkoutItems.reduce((s, i) => s + i.price * i.qty * 100, 0)) / 100,
    [checkoutItems]
  )
  const canSubmit = selectedAddressId && totalQty > 0

  async function loadAddresses() {
    const data = await api.addresses()
    setAddresses(data.list)
    setSelectedAddressId((prev) => {
      if (prev) return prev
      const def = data.list.find((a) => a.isDefault) || data.list[0]
      return def ? def.id : null
    })
  }

  async function saveAddress(formData) {
    setAddrError("")
    setAddrSaving(true)
    try {
      await api.addAddress(formData)
      setShowAddrForm(false)
      await loadAddresses()
      toast("地址已保存")
    } catch (err) {
      setAddrError(err.message)
    } finally {
      setAddrSaving(false)
    }
  }

  async function submitOrder() {
    setSubmitting(true)
    try {
      const items = checkoutItems.map((i) => ({ productId: i.productId, qty: i.qty }))
      const data = await api.createOrder({ addressId: selectedAddressId, items })
      await cart.fetchCart()
      toast("下单成功，快去支付吧 🎉")
      router(`/orders/${data.order.id}?pay=1`)
    } catch (err) {
      toast(err.message, "error")
    } finally {
      setSubmitting(false)
    }
  }

  useEffect(() => {
    Promise.all([cart.fetchCart(), loadAddresses()])
      .catch((err) => toast(err.message, "error"))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <main className="container checkout-page">
      <h2 className="section-title">📝 确认订单</h2>

      {/* 收货地址 */}
      <section className="panel">
        <div className="panel-head">
          <h3>收货地址</h3>
          <button
            className="add-addr-btn"
            onClick={() => {
              setAddrError("")
              setShowAddrForm(true)
            }}
          >
            ＋ 新增地址
          </button>
        </div>

        {addresses.length === 0 && !showAddrForm && (
          <p className="addr-empty">还没有收货地址，请先新增一个～</p>
        )}

        <div className="addr-list">
          {addresses.map((a) => (
            <label key={a.id} className={`addr-card${selectedAddressId === a.id ? " active" : ""}`}>
              <input
                type="radio"
                name="address"
                value={a.id}
                checked={selectedAddressId === a.id}
                onChange={() => setSelectedAddressId(a.id)}
              />
              <div className="addr-body">
                <div>
                  <b>{a.receiver}</b> {a.phone} {a.isDefault && <em>默认</em>}
                </div>
                <div className="addr-detail">
                  {a.region} {a.detail}
                </div>
              </div>
            </label>
          ))}
        </div>

        {showAddrForm && (
          <AddressForm
            error={addrError}
            submitting={addrSaving}
            onSave={saveAddress}
            onCancel={() => setShowAddrForm(false)}
          />
        )}
      </section>

      {/* 商品清单 */}
      <section className="panel">
        <h3>商品清单</h3>
        {checkoutItems.map((i) => (
          <div key={i.productId} className="item-row">
            <div className="item-img" style={{ background: i.bg }}>
              {i.emoji}
            </div>
            <span className="item-name">{i.name}</span>
            <span className="price">{formatPrice(i.price)}</span>
            <span className="item-qty">× {i.qty}</span>
            <span className="price item-sub">{formatPrice(i.price * i.qty)}</span>
          </div>
        ))}
        {checkoutItems.length === 0 && (
          <p className="addr-empty">
            没有可结算的商品，
            <Link to="/cart">返回购物车</Link>
            重新勾选吧～
          </p>
        )}
      </section>

      {/* 提交栏 */}
      <div className="checkout-bar">
        <span>
          共 <b>{totalQty}</b> 件商品，应付总额：
        </span>
        <strong className="price big">{formatPrice(total)}</strong>
        <button className="btn-primary submit-btn" disabled={!canSubmit || submitting} onClick={submitOrder}>
          {submitting ? "提交中..." : "提交订单"}
        </button>
      </div>
    </main>
  )
}
