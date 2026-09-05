import { useLocation, useNavigate } from "react-router-dom"
import { useAuthStore } from "../stores/auth"
import { useCartStore } from "../stores/cart"
import { toast } from "../toast"
import { formatPrice, formatSales } from "../utils"
import type { Product } from "../../../shared/types"

interface ProductCardProps {
  product: Product
}

export default function ProductCard({ product }: ProductCardProps) {
  const router = useNavigate()
  const route = useLocation()
  const auth = useAuthStore()
  const cart = useCartStore()

  function goDetail() {
    router(`/product/${product.id}`)
  }

  async function handleAdd() {
    if (!auth.isLoggedIn()) {
      toast("请先登录再购物哦～")
      router(`/login?redirect=${encodeURIComponent(route.pathname + route.search)}`)
      return
    }
    try {
      await cart.add(product.id, 1)
      toast("已加入购物车 🛒")
    } catch (err) {
      toast((err as Error).message, "error")
    }
  }

  return (
    <div
      className="product-card"
      role="link"
      tabIndex={0}
      aria-label={`查看商品 ${product.name}，价格 ${formatPrice(product.price)} 元`}
      onClick={goDetail}
      onKeyDown={(e) => e.key === "Enter" && goDetail()}
    >
      <div className="product-img" style={{ background: product.bg }}>
        {product.emoji}
        {product.stock <= 0 && <div className="sold-out-badge">已售罄</div>}
      </div>
      <div className="product-body">
        <div className="product-name">{product.name}</div>
        <div className="product-desc">{product.description}</div>
        <div className="product-bottom">
          <span className="price">{formatPrice(product.price)}</span>
          <span className="sales">{formatSales(product.sales)}</span>
          <button className="add-cart-btn" disabled={product.stock <= 0} onClick={(e) => { e.stopPropagation(); handleAdd() }}>
            {product.stock <= 0 ? "补货中" : "加入购物车"}
          </button>
        </div>
      </div>
    </div>
  )
}
