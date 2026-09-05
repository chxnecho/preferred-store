import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { api } from "../api"
import { useAuthStore } from "../stores/auth"
import { useCartStore } from "../stores/cart"
import { usePageTitle } from "../hooks/usePageTitle"
import { toast } from "../toast"
import { formatPrice, formatSales } from "../utils"
import type { Product } from "../../../shared/types"
import "../styles/ProductDetailView.css"

export default function ProductDetailView() {
  usePageTitle("商品详情")
  const { id = "" } = useParams()
  const navigate = useNavigate()
  const auth = useAuthStore()
  const cart = useCartStore()

  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [qty, setQty] = useState(1)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let active = true
    setLoading(true)
    setQty(1)
    api
      .product(id)
      .then((data) => {
        if (!active) return
        setProduct(data.product)
        document.title = `${data.product.name} - 优选商城`
      })
      .catch(() => {
        if (active) setProduct(null)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [id])

  function requireLogin() {
    if (auth.isLoggedIn()) return true
    toast("请先登录再购物哦～")
    navigate(`/login?redirect=${encodeURIComponent(`/product/${id}`)}`)
    return false
  }

  async function addToCart(buyNow: boolean) {
    if (!requireLogin()) return
    if (!product) return
    setSubmitting(true)
    try {
      await cart.add(product.id, qty)
      toast("已加入购物车 🛒")
      if (buyNow) navigate("/checkout")
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "添加失败", "error")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="container detail-page">
      {loading && <p className="empty-tip">加载中...</p>}
      {!loading && !product && <p className="empty-tip">商品不存在或已下架 😢</p>}
      {!loading && product && (
        <div className="detail-card">
          <div className="detail-img" style={{ background: product.bg }}>
            {product.emoji}
          </div>
          <div className="detail-info">
            <h2>{product.name}</h2>
            <p className="detail-desc">{product.description}</p>
            <div className="detail-meta">
              <span>分类：{product.category}</span>
              <span>{formatSales(product.sales)}</span>
              <span className={product.stock <= 10 ? "danger" : ""}>库存：{product.stock} 件</span>
            </div>
            <div className="detail-price-row">
              <span className="price big">{formatPrice(product.price)}</span>
            </div>

            {/* 数量选择 */}
            {product.stock > 0 && (
              <div className="qty-row">
                <label>数量</label>
                <div className="qty-control">
                  <button disabled={qty <= 1} onClick={() => setQty(Math.max(1, qty - 1))}>
                    −
                  </button>
                  <span className="qty">{qty}</span>
                  <button disabled={qty >= product.stock} onClick={() => setQty(Math.min(product.stock, qty + 1))}>
                    ＋
                  </button>
                </div>
              </div>
            )}

            <div className="detail-actions">
              {product.stock > 0 ? (
                <>
                  <button className="btn-outline" disabled={submitting} onClick={() => addToCart(false)}>
                    加入购物车
                  </button>
                  <button className="btn-primary buy-btn" disabled={submitting} onClick={() => addToCart(true)}>
                    {submitting ? "处理中..." : "立即购买"}
                  </button>
                </>
              ) : (
                <button className="btn-primary" disabled>
                  已售罄
                </button>
              )}
            </div>

            <div className="service-line">🚚 极速配送 · ✅ 正品保障 · 🔄 七天无理由退换</div>
          </div>
        </div>
      )}
    </main>
  )
}
