import { useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { useAuthStore } from "../stores/auth"
import { useCartStore } from "../stores/cart"
import { usePageTitle } from "../hooks/usePageTitle"
import { safeRedirectPath } from "../utils"
import "../styles/LoginView.css"

export default function LoginView() {
  usePageTitle("登录")
  const location = useLocation()
  const navigate = useNavigate()
  const auth = useAuthStore()
  const cart = useCartStore()

  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError("")
    if (!username || !password) {
      setError("请输入用户名和密码")
      return
    }
    setSubmitting(true)
    try {
      await auth.login(username, password)
      cart.fetchCart()
      const redirect = new URLSearchParams(location.search).get("redirect")
      navigate(safeRedirectPath(redirect))
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2>登录优选商城</h2>
        {error && <p className="form-error">{error}</p>}
        <form onSubmit={submit}>
          <div className="form-item">
            <label>用户名</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value.trim())}
              placeholder="请输入用户名"
              autoComplete="username"
            />
          </div>
          <div className="form-item">
            <label>密码</label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder="请输入密码"
              autoComplete="current-password"
            />
          </div>
          <button className="btn-primary btn-block" disabled={submitting}>
            {submitting ? "登录中..." : "登 录"}
          </button>
        </form>
        <p className="form-footer">
          还没有账号？
          <Link to={{ pathname: "/register", search: location.search }}>立即注册</Link>
        </p>
        <p className="demo-hint">演示账号：demo / 123456</p>
      </div>
    </div>
  )
}
