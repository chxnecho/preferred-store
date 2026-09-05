import "dotenv/config"
import express from "express"
import cors from "cors"
import helmet from "helmet"
import rateLimit from "express-rate-limit"
import compression from "compression"
import morgan from "morgan"
import path from "node:path"
import fs from "node:fs"
import { fileURLToPath, pathToFileURL } from "node:url"
import type { ErrorRequestHandler, NextFunction, Request, Response } from "express"

import { BizError } from "./errors"
import { startOrderExpiryJob } from "./jobs/order-expiry"
import authRoutes from "./routes/auth"
import productRoutes from "./routes/products"
import cartRoutes from "./routes/cart"
import addressRoutes from "./routes/addresses"
import orderRoutes from "./routes/orders"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()

// 反向代理（nginx 等）后获取真实客户端 IP，供速率限制使用
app.set("trust proxy", 1)

// ===== 安全响应头 =====
app.use(helmet())

// ===== 速率限制：全局宽松 + 认证接口严格（防暴力破解/批量注册） =====
// 测试环境跳过，避免用例请求被限流
const isTest = process.env.NODE_ENV === "test"
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isTest ? 1_000_000 : 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "请求过于频繁，请稍后再试" }
})
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isTest ? 1_000_000 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "操作过于频繁，请稍后再试" }
})
app.use("/api", apiLimiter)
app.use("/api/auth", authLimiter)

// ===== CORS =====
// 开发环境放开（配合 Vite 代理调试）；生产环境仅允许同源或 CORS_ORIGIN 白名单
if (process.env.NODE_ENV === "production") {
  const origins = (process.env.CORS_ORIGIN || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
  app.use(cors({ origin: origins.length ? origins : false }))
} else {
  app.use(cors())
}

app.use(express.json({ limit: "100kb" }))

// ===== HTTP 访问日志（测试环境静默） =====
if (!isTest) {
  app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"))
}

// ===== API 路由 =====
app.use("/api/auth", authRoutes)
app.use("/api/products", productRoutes)
app.use("/api/cart", cartRoutes)
app.use("/api/addresses", addressRoutes)
app.use("/api/orders", orderRoutes)

app.get("/api/health", (_req: Request, res: Response) =>
  res.json({ ok: true, time: new Date().toISOString() })
)

// 统一 404（API）
app.use("/api", (_req: Request, res: Response) => res.status(404).json({ message: "接口不存在" }))

// ===== 响应压缩 =====
app.use(compression())

// ===== 生产模式：托管前端构建产物 =====
if (process.env.NODE_ENV === "production") {
  const distDir = path.join(__dirname, "..", "client", "dist")
  if (fs.existsSync(distDir)) {
    // 缓存策略：带内容哈希的 assets 长缓存 immutable；index.html 不缓存保证发版即时生效
    app.use(
      express.static(distDir, {
        index: false,
        setHeaders(res: Response, filePath: string) {
          if (filePath.includes(`${path.sep}assets${path.sep}`)) {
            res.setHeader("Cache-Control", "public, max-age=31536000, immutable")
          }
        }
      })
    )
    app.get("*", (req: Request, res: Response, next: NextFunction) => {
      if (req.path.startsWith("/api")) return next()
      res.sendFile(path.join(distDir, "index.html"))
    })
  } else {
    console.warn("⚠️ 未找到 client/dist，请先执行 npm run build")
  }
}

// ===== 统一错误处理 =====
const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof BizError) {
    return res.status(err.statusCode || 400).json({ message: err.message })
  }
  if (err?.type === "entity.parse.failed") {
    return res.status(400).json({ message: "请求体 JSON 格式错误" })
  }
  console.error(`[server error] ${req.method} ${req.originalUrl}`, err)
  res.status(500).json({ message: "服务器内部错误，请稍后重试" })
}
app.use(errorHandler)

// 供测试等场景导入（配合 DB_PATH 使用内存数据库，不会真正监听端口）
export { app }

// 仅作为主模块直接运行时才启动监听与定时任务
const isMain = Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href
if (isMain) {
  const PORT = process.env.PORT || 3000

  // 定时取消超时未支付订单（回补库存）
  startOrderExpiryJob()

  app.listen(PORT, () => {
    console.log(
      `✅ 优选商城后端已启动: http://localhost:${PORT}${process.env.NODE_ENV === "production" ? "（生产模式）" : ""}`
    )
  })
}