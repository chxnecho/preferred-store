import jwt from "jsonwebtoken"
import { db } from "../db.js"

// 生产环境必须显式配置 JWT_SECRET，否则拒绝启动（防止使用代码库中的公开默认值签发可被伪造的 token）
if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
  throw new Error(
    "生产环境必须通过环境变量 JWT_SECRET 设置强随机密钥（参见 .env.example），服务拒绝启动。"
  )
}

// 开发环境兜底密钥仅用于本地调试
const SECRET = process.env.JWT_SECRET || "youcai-mall-dev-secret-only-for-development"

export function signToken(user) {
  return jwt.sign({ id: user.id, username: user.username }, SECRET, {
    expiresIn: "7d"
  })
}

/** 必须登录 */
export function authRequired(req, res, next) {
  const header = req.headers.authorization || ""
  const token = header.startsWith("Bearer ") ? header.slice(7) : null
  if (!token) return res.status(401).json({ message: "请先登录" })

  let payload
  try {
    payload = jwt.verify(token, SECRET)
  } catch {
    return res.status(401).json({ message: "登录已过期，请重新登录" })
  }

  // 签名有效后仍需确认用户存在，避免已删除用户的旧 token 在后续写入时触发外键 500
  const user = db.prepare("SELECT id, username, nickname FROM users WHERE id = ?").get(payload.id)
  if (!user) return res.status(401).json({ message: "登录状态已失效，请重新登录" })

  req.user = user
  next()
}
