import express from "express";
import cors from "cors";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

import authRoutes from "./routes/auth.js";
import productRoutes from "./routes/products.js";
import cartRoutes from "./routes/cart.js";
import addressRoutes from "./routes/addresses.js";
import orderRoutes from "./routes/orders.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors());
app.use(express.json());

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
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ message: "请求体 JSON 格式错误" });
  }
  console.error("[server error]", err);
  res.status(500).json({ message: "服务器内部错误，请稍后重试" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ 优选商城后端已启动: http://localhost:${PORT}${process.env.NODE_ENV === "production" ? "（生产模式）" : ""}`);
});
