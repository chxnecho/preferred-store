import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { api } from "../api"
import AddressForm from "../components/AddressForm"
import { confirm } from "../confirm"
import { useAuthStore } from "../stores/auth"
import { useCartStore } from "../stores/cart"
import { usePageTitle } from "../hooks/usePageTitle"
import { toast } from "../toast"
import type { Address, AddressInput } from "../../../shared/types"
import "../styles/profile.css"

export default function ProfileView() {
  usePageTitle("个人中心")
  const router = useNavigate()
  const auth = useAuthStore()
  const cart = useCartStore()

  const [addresses, setAddresses] = useState<Address[]>([])
  const [orderCount, setOrderCount] = useState(0)
  const [showForm, setShowForm] = useState(false)
  const [editingAddr, setEditingAddr] = useState<Address | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  function openForm(a: Address | null = null) {
    setEditingAddr(a)
    setError("")
    setShowForm(true)
  }

  async function loadAll() {
    try {
      const [addrData, orderData] = await Promise.all([api.addresses(), api.orders({ page: 1 })])
      setAddresses(addrData.list)
      setOrderCount(orderData.total)
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "加载失败", "error")
    }
  }

  async function save(formData: AddressInput) {
    setError("")
    setSaving(true)
    try {
      if (editingAddr) await api.updateAddress(editingAddr.id, formData)
      else await api.addAddress(formData)
      setShowForm(false)
      await loadAll()
      toast("已保存")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "保存失败")
    } finally {
      setSaving(false)
    }
  }

  async function removeAddr(a: Address) {
    const ok = await confirm(`确认删除「${a.receiver}」的地址吗？`, {
      title: "删除地址",
      danger: true
    })
    if (!ok) return
    try {
      await api.deleteAddress(a.id)
      await loadAll()
      toast("已删除")
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "删除失败", "error")
    }
  }

  async function setDefault(a: Address) {
    try {
      await api.updateAddress(a.id, { isDefault: true })
      await loadAll()
      toast("已设为默认地址")
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "设置失败", "error")
    }
  }

  function logout() {
    auth.logout()
    cart.fetchCart()
    toast("已退出登录")
    router("/")
  }

  useEffect(() => {
    loadAll()
     
  }, [])

  return (
    <main className="container profile-page">
      <h2 className="section-title">👤 个人中心</h2>

      {/* 基本信息 */}
      <section className="panel user-panel">
        <div className="avatar">{(auth.user?.nickname || auth.user?.username || "?").slice(0, 1)}</div>
        <div className="user-info">
          <b>{auth.user?.nickname || auth.user?.username}</b>
          <small>用户名：{auth.user?.username}</small>
        </div>
        <div className="user-stats">
          <a href="/orders" onClick={(e) => { e.preventDefault(); router("/orders") }}>
            <b>{orderCount}</b>
            <span>全部订单</span>
          </a>
          <a href="/cart" onClick={(e) => { e.preventDefault(); router("/cart") }}>
            <b>{cart.totalQty}</b>
            <span>购物车</span>
          </a>
        </div>
      </section>

      {/* 收货地址管理 */}
      <section className="panel">
        <div className="panel-head">
          <h3>收货地址</h3>
          <button className="add-addr-btn" onClick={() => openForm()}>
            ＋ 新增地址
          </button>
        </div>

        {addresses.length === 0 && !showForm && <p className="empty-tip small">还没有收货地址</p>}

        {addresses.map((a) => (
          <div key={a.id} className={`addr-row${a.isDefault ? " default" : ""}`}>
            <div className="addr-main">
              <div>
                <b>{a.receiver}</b> {a.phone} {a.isDefault && <em>默认</em>}
              </div>
              <div className="sub">
                {a.region} {a.detail}
              </div>
            </div>
            <div className="addr-ops">
              <button onClick={() => openForm(a)}>编辑</button>
              <button onClick={() => removeAddr(a)}>删除</button>
              {!a.isDefault && <button onClick={() => setDefault(a)}>设为默认</button>}
            </div>
          </div>
        ))}

        {/* 新增/编辑表单 */}
        {showForm && (
          <AddressForm
            initial={editingAddr}
            error={error}
            submitting={saving}
            onSave={save}
            onCancel={() => setShowForm(false)}
          />
        )}
      </section>

      {/* 其他 */}
      <section className="panel">
        <h3>账号</h3>
        <button className="logout-btn" onClick={logout}>
          退出登录
        </button>
      </section>
    </main>
  )
}
