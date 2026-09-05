import { useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { useAuthStore } from "../stores/auth"
import { usePageTitle } from "../hooks/usePageTitle"
import { safeRedirectPath } from "../utils"

export default function RegisterView() {
  usePageTitle("注册")
  const location = useLocation()
  const navigate = useNavigate()
  const auth = useAuthStore()

  const [username, setUsername] = useState("")
  const [nickname, setNickname] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError("")
    if (!username) return setError("请输入用户名")
    if (password.length < 6) return setError("密码至少 6 位")
    if (password !== confirmPassword) return setError("两次输入的密码不一致")

    setSubmitting(true)
    try {
      await auth.register({
        username,
        nickname: nickname || undefined,
        password
      })
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
        <h2>注册账号</h2>
        {error && <p className="form-error">{error}</p>}
        <form onSubmit={submit}>
          <div className="form-item">
            <label>用户名（3-20 位字母、数字、下划线或中文）</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value.trim())}
              placeholder="请输入用户名"
              autoComplete="username"
            />
          </div>
          <div className="form-item">
            <label>昵称（选填）</label>
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value.trim())}
              placeholder="给自己起个名字吧"
            />
          </div>
          <div className="form-item">
            <label>密码（6-32 位）</label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder="请输入密码"
              autoComplete="new-password"
            />
          </div>
          <div className="form-item">
            <label>确认密码</label>
            <input
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              type="password"
              placeholder="请再次输入密码"
              autoComplete="new-password"
            />
          </div>
          <button className="btn-primary btn-block" disabled={submitting}>
            {submitting ? "注册中..." : "注 册"}
          </button>
        </form>
        <p className="form-footer">
          已有账号？
          <Link to={{ pathname: "/login", search: location.search }}>去登录</Link>
        </p>
      </div>
    </div>
  )
}
