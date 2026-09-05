import { lazy, Suspense, useEffect, type ReactNode } from "react"
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom"
import NavBar from "./components/NavBar"
import ConfirmDialog from "./components/ConfirmDialog"
import ToastHost from "./components/ToastHost"
import { AUTH_EXPIRED_EVENT } from "./api"
import { useAuthStore } from "./stores/auth"
import { toast } from "./toast"
import HomeView from "./views/HomeView"

const ProductsView = lazy(() => import("./views/ProductsView"))
const ProductDetailView = lazy(() => import("./views/ProductDetailView"))
const LoginView = lazy(() => import("./views/LoginView"))
const RegisterView = lazy(() => import("./views/RegisterView"))
const CartView = lazy(() => import("./views/CartView"))
const CheckoutView = lazy(() => import("./views/CheckoutView"))
const OrdersView = lazy(() => import("./views/OrdersView"))
const OrderDetailView = lazy(() => import("./views/OrderDetailView"))
const ProfileView = lazy(() => import("./views/ProfileView"))

/** 路由切换时回到页面顶部（等价于 vue-router 的 scrollBehavior） */
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

/** 路由守卫：未登录访问需登录页面时跳转登录页并携带回跳地址 */
function RequireAuth({ children }: { children: ReactNode }) {
  const auth = useAuthStore()
  const location = useLocation()
  if (!auth.isLoggedIn()) {
    return (
      <Navigate
        to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`}
        replace
      />
    )
  }
  return children
}

function PageFallback() {
  return <p className="empty-tip">加载中...</p>
}

/** token 失效（api 层广播）：清理状态，按当前页面引导重新登录 */
function useAuthExpiredHandler() {
  const auth = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  useEffect(() => {
    function onAuthExpired() {
      auth.logout()
      const authedPages = ["/cart", "/orders", "/checkout", "/profile"]
      if (authedPages.some((p) => location.pathname.startsWith(p))) {
        navigate(`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`)
        toast("登录已过期，请重新登录", "error")
      }
    }
    window.addEventListener(AUTH_EXPIRED_EVENT, onAuthExpired)
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onAuthExpired)
  }, [auth, navigate, location.pathname, location.search])
}

export default function App() {
  const auth = useAuthStore()
  useAuthExpiredHandler()

  // 启动时刷新用户信息，避免 localStorage 缓存陈旧
  useEffect(() => {
    auth.fetchMe()
  }, [auth])

  return (
    <>
      <ScrollToTop />
      <NavBar />
      <Routes>
        <Route path="/" element={<HomeView />} />
        <Route
          path="/products"
          element={
            <Suspense fallback={<PageFallback />}>
              <ProductsView />
            </Suspense>
          }
        />
        <Route
          path="/product/:id"
          element={
            <Suspense fallback={<PageFallback />}>
              <ProductDetailView />
            </Suspense>
          }
        />
        <Route
          path="/login"
          element={
            <Suspense fallback={<PageFallback />}>
              <LoginView />
            </Suspense>
          }
        />
        <Route
          path="/register"
          element={
            <Suspense fallback={<PageFallback />}>
              <RegisterView />
            </Suspense>
          }
        />
        <Route
          path="/cart"
          element={
            <RequireAuth>
              <Suspense fallback={<PageFallback />}>
                <CartView />
              </Suspense>
            </RequireAuth>
          }
        />
        <Route
          path="/checkout"
          element={
            <RequireAuth>
              <Suspense fallback={<PageFallback />}>
                <CheckoutView />
              </Suspense>
            </RequireAuth>
          }
        />
        <Route
          path="/orders"
          element={
            <RequireAuth>
              <Suspense fallback={<PageFallback />}>
                <OrdersView />
              </Suspense>
            </RequireAuth>
          }
        />
        <Route
          path="/orders/:id"
          element={
            <RequireAuth>
              <Suspense fallback={<PageFallback />}>
                <OrderDetailView />
              </Suspense>
            </RequireAuth>
          }
        />
        <Route
          path="/profile"
          element={
            <RequireAuth>
              <Suspense fallback={<PageFallback />}>
                <ProfileView />
              </Suspense>
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <footer className="footer">
        <div className="container">
          <p>© 2026 优选商城 · 精选好物，品质生活</p>
        </div>
      </footer>
      <ToastHost />
      <ConfirmDialog />
    </>
  )
}
