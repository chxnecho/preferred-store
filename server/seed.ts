// 种子数据：18 款商品 + 演示账号（demo / 123456）
// 用法：node server/seed.ts [--force]   --force 会清空商品表后重灌
import "dotenv/config"
import bcrypt from "bcryptjs"
import { db, dbGet } from "./db"

const PRODUCTS: Array<[string, string, number, number, string, string, string, number]> = [
  ["无线降噪耳机", "主动降噪 · 40小时续航 · 蓝牙5.3", 499, 23000, "数码", "🎧", "#e8f1ff", 300],
  ["智能手表 Pro", "心率监测 · GPS定位 · 超长待机", 1299, 8600, "数码", "⌚", "#eafaf0", 200],
  ["便携蓝牙音箱", "重低音 · IPX7防水 · 户外必备", 199, 51000, "数码", "🔊", "#fff4e5", 400],
  ["轻薄笔记本电脑", "16G内存 · 512G固态 · 1.2kg轻巧", 4599, 3200, "数码", "💻", "#f0eaff", 50],
  ["经典纯棉T恤", "100%纯棉 · 透气舒适 · 多色可选", 79, 120000, "服饰", "👕", "#e5f6ff", 800],
  ["休闲运动卫衣", "加绒保暖 · 宽松版型 · 潮流百搭", 159, 36000, "服饰", "🧥", "#ffeef0", 500],
  ["轻便跑步鞋", "缓震回弹 · 透气网面 · 轻若无物", 269, 78000, "服饰", "👟", "#efffef", 600],
  ["时尚双肩背包", "大容量 · 防泼水 · 15.6寸电脑仓", 139, 29000, "服饰", "🎒", "#fdf6e3", 450],
  ["简约陶瓷马克杯", "釉下彩工艺 · 微波炉可用 · 420ml", 39, 64000, "家居", "☕", "#fdeeee", 900],
  ["香薰蜡烛礼盒", "天然大豆蜡 · 持久留香 · 助眠放松", 89, 18000, "家居", "🕯️", "#fff8e8", 350],
  ["记忆棉枕头", "慢回弹 · 护颈助眠 · 可拆洗枕套", 129, 42000, "家居", "🛏️", "#eef4ff", 550],
  ["多功能收纳盒", "桌面整理 · 分层设计 · 环保材质", 49, 97000, "家居", "📦", "#f0faf5", 1000],
  ["保湿修护面霜", "玻尿酸保湿 · 48h锁水 · 敏感肌适用", 219, 31000, "美妆", "🧴", "#ffe9f2", 400],
  ["丝绒哑光口红", "显白不拔干 · 持久不脱色 · 6色号", 149, 89000, "美妆", "💄", "#ffeded", 700],
  ["氨基酸洁面乳", "温和清洁 · 绵密泡沫 · 不紧绷", 69, 55000, "美妆", "🫧", "#e9f7ff", 800],
  ["进口坚果礼盒", "每日坚果 · 6种搭配 · 新鲜锁鲜", 99, 100000, "食品", "🥜", "#fdf3e0", 900],
  ["手冲咖啡豆", "中度烘焙 · 坚果风味 · 250g装", 78, 27000, "食品", "☕", "#f3ece4", 500],
  ["网红零食大礼包", "12种零食组合 · 追剧必备 · 超值装", 59, 150000, "食品", "🍪", "#fff0e6", 1200]
]

const force = process.argv.includes("--force")
const count = dbGet<{ c: number }>(db.prepare("SELECT COUNT(*) AS c FROM products"))!.c

if (count > 0 && !force) {
  console.log(`商品表已有 ${count} 条数据，跳过种子（使用 --force 重灌）`)
} else {
  if (force) {
    db.exec("DELETE FROM order_items; DELETE FROM orders; DELETE FROM cart_items; DELETE FROM products;")
    console.log("已清空商品相关数据")
  }
  const stmt = db.prepare(
    `INSERT INTO products (name, description, price_cents, sales, category, emoji, bg, stock)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  )
  // 金额以整数分（元 × 100）入库，避免浮点存储
  for (const [name, desc, priceYuan, sales, category, emoji, bg, stock] of PRODUCTS) {
    stmt.run(name, desc, Math.round(priceYuan * 100), sales, category, emoji, bg, stock)
  }
  console.log(`已写入 ${PRODUCTS.length} 款商品`)
}

// 演示账号
if (!dbGet<{ id: number }>(db.prepare("SELECT id FROM users WHERE username = ?"), "demo")) {
  const hash = bcrypt.hashSync("123456", 10)
  db.prepare("INSERT INTO users (username, password_hash, nickname) VALUES (?, ?, ?)").run(
    "demo",
    hash,
    "演示用户"
  )
  const uid = dbGet<{ id: number }>(db.prepare("SELECT id FROM users WHERE username = ?"), "demo")!.id
  db.prepare(
    "INSERT INTO addresses (user_id, receiver, phone, region, detail, is_default) VALUES (?, ?, ?, ?, ?, 1)"
  ).run(uid, "陈先生", "13800000000", "上海市 上海市 浦东新区", "张江高科技园区博云路 2 号 101 室")
  console.log("已创建演示账号：demo / 123456")
} else {
  console.log("演示账号 demo 已存在，跳过")
}

console.log("✅ 种子数据完成")