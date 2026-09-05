import { useEffect, useRef, useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { useAuthStore } from "../stores/auth"
import { useCartStore } from "../stores/cart"
import "../styles/navbar.css"

export default function NavBar() {
  const auth = useAuthStore()
  const cart = useCartStore()
  const location = useLocation()
  const navigate = useNavigate()

  const keywordInputRef = useRef<HTMLInputElement>(null)
  const [keyword, setKeyword] = useState("")
  const [menuOpen, setMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  // 路由变化：同步搜索框、关闭菜单
  useEffect(() => {
    if (location.pathname === "/products") {
      setKeyword(
        location.search.includes("keyword=")
          ? new URLSearchParams(location.search).get("keyword") || ""
          : ""
      )
    }
    setMenuOpen(false)
  }, [location])

  // 点击下拉菜单外部或按 Esc 时关闭
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (menuOpen && userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    function onDocKeydown(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false)
    }
    document.addEventListener("click", onDocClick)
    document.addEventListener("keydown", onDocKeydown)
    return () => {
      document.removeEventListener("click", onDocClick)
      document.removeEventListener("keydown", onDocKeydown)
    }
  }, [menuOpen])

  function doSearch() {
    const kw = keywordInputRef.current?.value.trim() || ""
    const params = new URLSearchParams(location.search)
    if (kw) params.set("keyword", kw)
    else params.delete("keyword")
    params.set("page", "1")
    navigate(`/products?${params.toString()}`)
  }

  function logout() {
    setMenuOpen(false)
    auth.logout()
    cart.fetchCart()
    navigate("/")
  }

  return (
    <header className="header">
      <div className="container header-inner">
        <Link className="logo" to="/">
          🛍️ 优选商城
        </Link>
        <div className="search-box">
          <input
            ref={keywordInputRef}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            type="text"
            placeholder="搜索商品..."
            onKeyDown={(e) => e.key === "Enter" && doSearch()}
          />
          <button onClick={doSearch}>🔍</button>
        </div>
        <nav className="nav">
          <Link to="/">首页</Link>
          <Link to="/products">全部商品</Link>
          {auth.isLoggedIn() && <Link to="/orders">我的订单</Link>}
          <button className="cart-btn" onClick={() => navigate("/cart")}>
            🛒 购物车
            {cart.totalQty > 0 && <span className="cart-count">{cart.totalQty}</span>}
          </button>
          {auth.isLoggedIn() ? (
            <div ref={userMenuRef} className="user-menu" onClick={(e) => e.stopPropagation()}>
              <span
                className="user-name"
                role="button"
                tabIndex={0}
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen(!menuOpen)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") setMenuOpen(!menuOpen)
                  if (e.key === "Escape") setMenuOpen(false)
                }}
              >
                👤 {auth.user?.nickname || auth.user?.username} ▾
              </span>
              {menuOpen && (
                <div className="dropdown" onClick={() => setMenuOpen(false)}>
                  <Link to="/profile">个人中心</Link>
                  <Link to="/orders">我的订单</Link>
                  <button onClick={logout}>退出登录</button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link className="keep" to="/login">
                登录
              </Link>
              <Link className="keep" to="/register">
                注册
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
