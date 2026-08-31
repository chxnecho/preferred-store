import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

import { BizError } from "./errors.js";
import { startOrderExpiryJob } from "./jobs/order-expiry.js";
import authRoutes from "./routes/auth.js";
import productRoutes from "./routes/products.js";
import cartRoutes from "./routes/cart.js";
import addressRoutes from "./routes/addresses.js";
import orderRoutes from "./routes/orders.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// 反向代理（nginx 等）后获取真实客户端 IP，供速率限制使用
app.set("trust proxy", 1);

// ===== 安全响应头 =====
app.use(helmet());

// ===== 速率限制：全局宽松 + 认证接口严格（防暴力破解/批量注册） =====
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "请求过于频繁，请稍后再试" },
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "操作过于频繁，请稍后再试" },
});
app.use("/api", apiLimiter);
app.use("/api/auth", authLimiter);

// ===== CORS =====
// 开发环境放开（配合 Vite 代理调试）；生产环境仅允许同源或 CORS_ORIGIN 白名单
if (process.env.NODE_ENV === "production") {
  const origins = (process.env.CORS_ORIGIN || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  app.use(cors({ origin: origins.length ? origins : false }));
} else {
  app.use(cors());
}

app.use(express.json({ limit: "100kb" }));

// ===== API 路由 =====
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/addresses", addressRoutes);
app.use("/api/orders", orderRoutes);

app.get("/api/health", (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// 统一 404（API）
app.use("/api", (_req, res) => res.status(404).json({ message: "接口不存在" }));

// ===== 生产模式：托管前端构建产物 =====
if (process.env.NODE_ENV === "production") {
  const distDir = path.join(__dirname, "..", "client", "dist");
  if (fs.existsSync(distDir)) {
    app.use(express.static(distDir));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api")) return next();
      res.sendFile(path.join(distDir, "index.html"));
    });
  } else {
    console.warn("⚠️ 未找到 client/dist，请先执行 npm run build");
  }
}

// ===== 统一错误处理 =====
app.use((err, _req, res, _next) => {
  if (err instanceof BizError) {
    return res.status(err.statusCode || 400).json({ message: err.message });
  }
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ message: "请求体 JSON 格式错误" });
  }
  console.error("[server error]", err);
  res.status(500).json({ message: "服务器内部错误，请稍后重试" });
});

const PORT = process.env.PORT || 3000;

// 定时取消超时未支付订单（回补库存）
startOrderExpiryJob();

app.listen(PORT, () => {
  console.log(`✅ 优选商城后端已启动: http://localhost:${PORT}${process.env.NODE_ENV === "production" ? "（生产模式）" : ""}`);
});
